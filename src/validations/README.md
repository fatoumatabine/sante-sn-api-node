# Validation Architecture

Ce dossier centralise les validations Zod de l'API.

## Structure

- `schemas/`: schémas Zod par domaine métier
- `index.ts`: point d'entrée unique pour les imports (`import { ... } from '../../../validations'`)
- `src/modules/*/contracts/*.route.contract.ts`: contrat des routes par module

## Compatibilité

Les fichiers `src/modules/*/dto/*.dto.ts` ré-exportent les schémas de ce dossier pour ne pas casser l'existant.

## Bonnes pratiques

- Ajouter chaque nouveau schéma dans `schemas/<module>.schema.ts`
- Exporter dans `src/validations/index.ts`
- Utiliser `httpKernel.body(...)`, `httpKernel.params(...)`, `httpKernel.query(...)` dans les routes
- Mettre à jour le contrat `src/modules/<module>/contracts/<module>.route.contract.ts`
- Lancer `npm run check:routes-kernel` avant commit
