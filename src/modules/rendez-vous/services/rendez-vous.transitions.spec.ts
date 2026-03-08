import assert from 'assert/strict';
import { StatutRendezVous } from '@prisma/client';
import { canTransitionRendezVous } from './rendez-vous.service';

function run() {
  // Allowed transitions
  assert.equal(canTransitionRendezVous(StatutRendezVous.en_attente, StatutRendezVous.confirme), true);
  assert.equal(canTransitionRendezVous(StatutRendezVous.en_attente, StatutRendezVous.annule), true);
  assert.equal(canTransitionRendezVous(StatutRendezVous.confirme, StatutRendezVous.paye), true);
  assert.equal(canTransitionRendezVous(StatutRendezVous.confirme, StatutRendezVous.annule), true);
  assert.equal(canTransitionRendezVous(StatutRendezVous.confirme, StatutRendezVous.termine), true);
  assert.equal(canTransitionRendezVous(StatutRendezVous.paye, StatutRendezVous.termine), true);

  // Forbidden transitions
  assert.equal(canTransitionRendezVous(StatutRendezVous.en_attente, StatutRendezVous.paye), false);
  assert.equal(canTransitionRendezVous(StatutRendezVous.en_attente, StatutRendezVous.termine), false);
  assert.equal(canTransitionRendezVous(StatutRendezVous.annule, StatutRendezVous.confirme), false);
  assert.equal(canTransitionRendezVous(StatutRendezVous.termine, StatutRendezVous.confirme), false);
  assert.equal(canTransitionRendezVous(StatutRendezVous.confirme, StatutRendezVous.en_attente), false);

  // Same-state transition forbidden
  assert.equal(canTransitionRendezVous(StatutRendezVous.confirme, StatutRendezVous.confirme), false);

  console.log('OK: règles de transition RDV validées');
}

run();
