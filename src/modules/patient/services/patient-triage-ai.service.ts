import { AppError } from '../../../shared/utils/AppError';
import { z } from 'zod';

export const TRIAGE_LEVEL_VALUES = ['faible', 'modere', 'eleve'] as const;
export const TRIAGE_ORIENTATION_VALUES = ['auto_soin', 'rendez_vous', 'urgence', 'revue_humaine'] as const;

export const PatientTriageAiResultSchema = z.object({
  niveau: z.enum(TRIAGE_LEVEL_VALUES),
  urgent: z.boolean(),
  specialiteConseillee: z.string(),
  recommandations: z.array(z.string()).min(1),
  redFlags: z.array(z.string()),
  needsHumanReview: z.boolean(),
  orientation: z.enum(TRIAGE_ORIENTATION_VALUES),
});

export type PatientTriageAiResult = z.infer<typeof PatientTriageAiResultSchema>;

interface PatientProfileContext {
  dateNaissance?: Date | null;
  groupeSanguin?: string | null;
  diabete?: boolean;
  hypertension?: boolean;
  hepatite?: boolean;
  autresPathologies?: string | null;
}

interface RunPatientTriageParams {
  patientProfile: PatientProfileContext;
  responses: Record<string, string | string[]>;
  contexteLibre?: string;
  availableSpecialties: string[];
}

interface OpenAIResponsesCreateResponse {
  output_text?: string;
  output?: Array<{
    type?: string;
    refusal?: string;
    content?: Array<{
      type?: string;
      text?: string;
      refusal?: string;
    }>;
  }>;
  error?: {
    message?: string;
  };
}

const TRIAGE_RESPONSE_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'niveau',
    'urgent',
    'specialiteConseillee',
    'recommandations',
    'redFlags',
    'needsHumanReview',
    'orientation',
  ],
  properties: {
    niveau: {
      type: 'string',
      enum: [...TRIAGE_LEVEL_VALUES],
    },
    urgent: {
      type: 'boolean',
    },
    specialiteConseillee: {
      type: 'string',
      description:
        'Use one exact value from the provided specialties list when possible, otherwise return an empty string.',
    },
    recommandations: {
      type: 'array',
      items: {
        type: 'string',
      },
      minItems: 1,
    },
    redFlags: {
      type: 'array',
      items: {
        type: 'string',
      },
    },
    needsHumanReview: {
      type: 'boolean',
    },
    orientation: {
      type: 'string',
      enum: [...TRIAGE_ORIENTATION_VALUES],
    },
  },
} as const;

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_TRIAGE_MODEL = 'gpt-5.4';
const FALLBACK_TRIAGE_MODEL = 'triage-fallback-local';
const OPENAI_API_KEY_PLACEHOLDERS = new Set([
  'your_openai_api_key',
  'change_me',
  'changeme',
  'your-api-key',
  'your_api_key',
]);

function normalizeForMatch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function isPlaceholderApiKey(value: string): boolean {
  return OPENAI_API_KEY_PLACEHOLDERS.has(value.trim().toLowerCase());
}

function computePatientAge(dateNaissance?: Date | null): number | null {
  if (!dateNaissance) {
    return null;
  }

  const date = new Date(dateNaissance);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const now = new Date();
  let age = now.getFullYear() - date.getFullYear();
  const monthDifference = now.getMonth() - date.getMonth();
  if (monthDifference < 0 || (monthDifference === 0 && now.getDate() < date.getDate())) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

function normalizeStringArray(values: string[]): string[] {
  const unique = new Set<string>();
  for (const value of values) {
    const trimmed = value.trim();
    if (trimmed) {
      unique.add(trimmed);
    }
  }
  return Array.from(unique);
}

function getResponseString(
  responses: Record<string, string | string[]>,
  key: string
): string {
  const value = responses[key];
  if (typeof value === 'string') {
    return value.trim();
  }
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string').join(', ').trim();
  }
  return '';
}

function getResponseArray(
  responses: Record<string, string | string[]>,
  key: string
): string[] {
  const value = responses[key];
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  }
  if (typeof value === 'string' && value.trim()) {
    return [value.trim()];
  }
  return [];
}

function normalizeSpecialite(value: string, availableSpecialties: string[]): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  const exactMatch = availableSpecialties.find(
    (specialite) => specialite.toLowerCase() === trimmed.toLowerCase()
  );

  return exactMatch || '';
}

function resolveSpecialiteFromCandidates(
  availableSpecialties: string[],
  candidates: string[]
): string {
  const normalizedSpecialties = availableSpecialties.map((specialite) => ({
    value: specialite,
    normalized: normalizeForMatch(specialite),
  }));

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeForMatch(candidate);
    if (!normalizedCandidate) {
      continue;
    }

    const exactMatch = normalizedSpecialties.find(
      (item) => item.normalized === normalizedCandidate
    );
    if (exactMatch) {
      return exactMatch.value;
    }

    const partialMatch = normalizedSpecialties.find(
      (item) =>
        item.normalized.includes(normalizedCandidate) ||
        normalizedCandidate.includes(item.normalized)
    );
    if (partialMatch) {
      return partialMatch.value;
    }
  }

  return '';
}

function buildFallbackEvaluation(
  params: RunPatientTriageParams
): PatientTriageAiResult & { aiModel: string } {
  const symptom = getResponseString(params.responses, 'q1');
  const duration = getResponseString(params.responses, 'q2');
  const intensity = Math.min(
    10,
    Math.max(0, Number.parseInt(getResponseString(params.responses, 'q3') || '0', 10) || 0)
  );
  const antecedents = getResponseArray(params.responses, 'q4');
  const fever = getResponseString(params.responses, 'q7');
  const associatedSymptoms = getResponseArray(params.responses, 'q8');
  const freeContext = params.contexteLibre?.trim() || '';

  const normalizedText = normalizeForMatch(
    [
      symptom,
      duration,
      fever,
      freeContext,
      ...antecedents,
      ...associatedSymptoms,
    ].join(' ')
  );

  const hasKeyword = (keywords: string[]) =>
    keywords.some((keyword) => normalizedText.includes(normalizeForMatch(keyword)));

  const hasRespiratorySymptoms =
    hasKeyword(['problemes respiratoires', 'difficulte respiratoire', 'essoufflement', 'respiration']) ||
    associatedSymptoms.some((item) => normalizeForMatch(item) === 'toux');
  const hasDigestiveSymptoms = hasKeyword([
    'problemes digestifs',
    'nausees',
    'vomissements',
    'diarrhee',
    'douleur abdominale',
  ]);
  const hasSkinSymptoms = hasKeyword(['problemes de peau', 'eruption', 'demangeaison', 'peau']);
  const hasChestPain = hasKeyword([
    'douleur thoracique',
    'douleur poitrine',
    'oppression thoracique',
    'poitrine',
  ]);
  const hasNeurologicConcern = hasKeyword([
    'perte de connaissance',
    'convulsion',
    'paralysie',
    'confusion',
  ]);
  const hasBleedingConcern = hasKeyword(['saignement abondant', 'hemorragie', 'saignement']);
  const hasHighFever = normalizeForMatch(fever).includes('elevee');
  const hasModerateFever = normalizeForMatch(fever).includes('moderee');
  const hasRiskProfile =
    Boolean(params.patientProfile.diabete) ||
    Boolean(params.patientProfile.hypertension) ||
    Boolean(params.patientProfile.hepatite) ||
    antecedents.some((item) =>
      ['diabete', 'hypertension', 'maladies cardiaques', 'maladies chroniques'].includes(
        normalizeForMatch(item)
      )
    );
  const longDuration = hasKeyword(["plus d'un mois", 'plus d un mois', '2 a 4 semaines', '2 a 4 semaines']);

  const redFlags: string[] = [];
  if (intensity >= 8) {
    redFlags.push("Symptomes d'intensite elevee");
  }
  if (hasHighFever) {
    redFlags.push('Fievre elevee rapportee');
  }
  if (hasRespiratorySymptoms) {
    redFlags.push('Gene respiratoire ou symptomes respiratoires rapportes');
  }
  if (hasChestPain) {
    redFlags.push('Douleur thoracique ou oppression thoracique rapportee');
  }
  if (hasNeurologicConcern) {
    redFlags.push('Signe neurologique necessitant une evaluation humaine');
  }
  if (hasBleedingConcern) {
    redFlags.push('Saignement important rapporte');
  }
  if (hasRiskProfile && intensity >= 5) {
    redFlags.push('Antecedents a risque associes aux symptomes actuels');
  }

  const urgent =
    intensity >= 9 ||
    hasHighFever ||
    hasChestPain ||
    hasNeurologicConcern ||
    hasBleedingConcern ||
    (hasRespiratorySymptoms && intensity >= 7);

  const specialiteConseillee = resolveSpecialiteFromCandidates(params.availableSpecialties, [
    ...(hasChestPain ? ['Cardiologie'] : []),
    ...(hasRespiratorySymptoms ? ['Pneumologie'] : []),
    ...(hasDigestiveSymptoms ? ['Gastro-enterologie', 'Gastroenterologie'] : []),
    ...(hasSkinSymptoms ? ['Dermatologie'] : []),
    'Medecine Generale',
    'Medecine interne',
  ]);

  const needsHumanReview =
    urgent ||
    normalizeForMatch(symptom) === 'autre' ||
    (hasRiskProfile && intensity >= 4) ||
    longDuration ||
    redFlags.length > 0;

  let orientation: PatientTriageAiResult['orientation'] = 'auto_soin';
  if (urgent) {
    orientation = 'urgence';
  } else if (needsHumanReview && (intensity >= 4 || !specialiteConseillee)) {
    orientation = 'revue_humaine';
  } else if (intensity >= 4 || hasModerateFever || specialiteConseillee) {
    orientation = 'rendez_vous';
  }

  let niveau: PatientTriageAiResult['niveau'] = 'faible';
  if (urgent) {
    niveau = 'eleve';
  } else if (orientation === 'rendez_vous' || orientation === 'revue_humaine' || intensity >= 5) {
    niveau = 'modere';
  }

  const recommandations: string[] = [];
  if (orientation === 'urgence') {
    recommandations.push(
      "Consultez un service d'urgence sans tarder et ne retardez pas la prise en charge si l'etat s'aggrave."
    );
  } else if (orientation === 'revue_humaine') {
    recommandations.push(
      'Une revue humaine rapide est recommandee avant toute orientation automatique.'
    );
  } else if (orientation === 'rendez_vous') {
    recommandations.push(
      'Prenez rendez-vous avec un professionnel de sante dans les 24 a 48 heures.'
    );
  } else {
    recommandations.push(
      "Surveillez l'evolution des symptomes et prenez rendez-vous s'ils persistent ou s'aggravent."
    );
  }

  if (hasHighFever || hasModerateFever) {
    recommandations.push('Hydratez-vous regulierement et surveillez la temperature.');
  }
  if (hasRespiratorySymptoms) {
    recommandations.push(
      "Evitez les irritants respiratoires et consultez rapidement si la gene respiratoire augmente."
    );
  }
  if (hasDigestiveSymptoms) {
    recommandations.push('Adoptez une alimentation legere et surveillez les signes de deshydratation.');
  }
  if (hasSkinSymptoms) {
    recommandations.push('Gardez la zone atteinte propre et evitez les produits irritants.');
  }
  if (normalizeForMatch(symptom).includes('douleur') || intensity >= 5) {
    recommandations.push("Notez la localisation et l'evolution de la douleur pour la consultation.");
  }
  if (normalizeForMatch(symptom).includes('fatigue')) {
    recommandations.push('Reposez-vous et signalez tout essoufflement ou aggravation inhabituelle.');
  }
  if (hasRiskProfile) {
    recommandations.push(
      'Mentionnez clairement vos antecedents medicaux et traitements habituels au professionnel de sante.'
    );
  }

  recommandations.push('Cette pre-evaluation ne remplace pas un avis medical professionnel.');

  return {
    niveau,
    urgent,
    specialiteConseillee,
    recommandations: normalizeStringArray(recommandations),
    redFlags: normalizeStringArray(redFlags),
    needsHumanReview,
    orientation,
    aiModel: FALLBACK_TRIAGE_MODEL,
  };
}

function buildSystemPrompt(availableSpecialties: string[]): string {
  const specialties = availableSpecialties.length > 0 ? availableSpecialties.join(', ') : 'aucune spécialité fournie';

  return [
    'Tu es un assistant de pre-triage medical pour une application de telemedecine.',
    'Tu ne poses jamais de diagnostic final et tu ne prescris jamais de traitement.',
    'Tu dois rester prudent: en cas de doute, d information insuffisante ou de signaux graves, choisis une orientation conservatrice.',
    'Tu dois produire uniquement un objet JSON conforme au schema fourni.',
    'Definitions:',
    '- niveau: faible, modere ou eleve.',
    '- urgent=true si le patient doit etre oriente rapidement vers une evaluation humaine ou une prise en charge urgente.',
    '- needsHumanReview=true si un professionnel doit revoir le cas avant de rassurer ou d orienter automatiquement.',
    '- orientation autorisee: auto_soin, rendez_vous, urgence, revue_humaine.',
    '- specialiteConseillee doit etre soit une valeur exacte de cette liste soit une chaine vide: ' + specialties,
    '- recommandations: phrases courtes, actionnables, non diagnostiques, en francais.',
    '- redFlags: liste des elements inquietants trouves dans les reponses; vide si aucun element net.',
    'Regles de securite:',
    '- Si des signaux graves ou une forte incertitude existent, mets urgent=true et orientation=urgence ou revue_humaine.',
    '- N invente jamais de specialite hors liste.',
    '- Si aucune specialite n est pertinente ou si le cas releve d une urgence, retourne une chaine vide.',
  ].join('\n');
}

function buildUserPayload(params: RunPatientTriageParams): string {
  return JSON.stringify(
    {
      patient: {
        age: computePatientAge(params.patientProfile.dateNaissance),
        groupeSanguin: params.patientProfile.groupeSanguin || '',
        antecedents: {
          diabete: Boolean(params.patientProfile.diabete),
          hypertension: Boolean(params.patientProfile.hypertension),
          hepatite: Boolean(params.patientProfile.hepatite),
          autresPathologies: params.patientProfile.autresPathologies || '',
        },
      },
      questionnaire: params.responses,
      contexteLibre: params.contexteLibre?.trim() || '',
      specialitesDisponibles: params.availableSpecialties,
    },
    null,
    2
  );
}

function extractOutputText(payload: OpenAIResponsesCreateResponse): string {
  if (typeof payload.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text;
  }

  for (const item of payload.output || []) {
    if (typeof item.refusal === 'string' && item.refusal.trim()) {
      throw new AppError(`Le triage IA a refusé la demande: ${item.refusal}`, 503);
    }

    for (const content of item.content || []) {
      if (typeof content.refusal === 'string' && content.refusal.trim()) {
        throw new AppError(`Le triage IA a refusé la demande: ${content.refusal}`, 503);
      }

      if (content.type === 'output_text' && typeof content.text === 'string' && content.text.trim()) {
        return content.text;
      }
    }
  }

  throw new AppError('Réponse vide du service de triage IA', 502);
}

export class PatientTriageAiService {
  private isFallbackEnabled(): boolean {
    const raw = process.env.OPENAI_TRIAGE_FALLBACK?.trim().toLowerCase();
    if (raw === 'true') {
      return true;
    }
    if (raw === 'false') {
      return false;
    }
    return true;
  }

  private runFallbackEvaluation(
    params: RunPatientTriageParams,
    reason: string
  ): PatientTriageAiResult & { aiModel: string } {
    console.warn(`[PatientTriageAiService] Fallback triage active: ${reason}`);
    return buildFallbackEvaluation(params);
  }

  private resolveApiKey(): string {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      throw new AppError('OPENAI_API_KEY est requis pour le triage IA', 503);
    }
    if (isPlaceholderApiKey(apiKey)) {
      throw new AppError('OPENAI_API_KEY utilise encore une valeur d’exemple', 503);
    }
    return apiKey;
  }

  private resolveModel(): string {
    return process.env.OPENAI_TRIAGE_MODEL?.trim() || DEFAULT_TRIAGE_MODEL;
  }

  async runEvaluation(params: RunPatientTriageParams): Promise<PatientTriageAiResult & { aiModel: string }> {
    try {
      const apiKey = this.resolveApiKey();
      const model = this.resolveModel();

      const httpResponse = await fetch(OPENAI_RESPONSES_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          input: [
            {
              role: 'system',
              content: [
                {
                  type: 'input_text',
                  text: buildSystemPrompt(params.availableSpecialties),
                },
              ],
            },
            {
              role: 'user',
              content: [
                {
                  type: 'input_text',
                  text: buildUserPayload(params),
                },
              ],
            },
          ],
          text: {
            format: {
              type: 'json_schema',
              name: 'patient_triage_result',
              strict: true,
              schema: TRIAGE_RESPONSE_JSON_SCHEMA,
            },
          },
        }),
      });

      const rawBody = await httpResponse.text();

      let payload: OpenAIResponsesCreateResponse = {};
      try {
        payload = rawBody ? (JSON.parse(rawBody) as OpenAIResponsesCreateResponse) : {};
      } catch {
        if (!httpResponse.ok) {
          throw new AppError('Le service OpenAI a retourné une erreur non exploitable', 502);
        }
      }

      if (!httpResponse.ok) {
        throw new AppError(
          payload.error?.message || 'Échec de génération du triage IA',
          httpResponse.status >= 400 && httpResponse.status < 600 ? httpResponse.status : 502
        );
      }

      let parsedOutput: unknown;
      try {
        parsedOutput = JSON.parse(extractOutputText(payload));
      } catch {
        throw new AppError('La réponse OpenAI n’est pas un JSON valide pour le triage', 502);
      }

      const triage = PatientTriageAiResultSchema.parse(parsedOutput);
      const recommandations = normalizeStringArray(triage.recommandations);
      if (!recommandations.length) {
        throw new AppError('La réponse OpenAI ne contient aucune recommandation exploitable', 502);
      }

      return {
        ...triage,
        specialiteConseillee: normalizeSpecialite(triage.specialiteConseillee, params.availableSpecialties),
        recommandations,
        redFlags: normalizeStringArray(triage.redFlags),
        aiModel: model,
      };
    } catch (error) {
      if (this.isFallbackEnabled()) {
        const reason = error instanceof Error ? error.message : 'Erreur inconnue';
        return this.runFallbackEvaluation(params, reason);
      }
      throw error;
    }
  }
}

export const patientTriageAiService = new PatientTriageAiService();
