(function (root) {
  'use strict';

  var STAGES = {
    NOT_YET: 'NOT_YET',
    VERIFICATION_ATTEMPT: 'VERIFICATION_ATTEMPT',
    HUNTRESS_CONFIRMED: 'HUNTRESS_CONFIRMED',
    FUTURE_UNLOCKED: 'FUTURE_UNLOCKED'
  };

  function pending() {
    return Promise.resolve({
      ok: false,
      confirmed: false,
      stage: STAGES.VERIFICATION_ATTEMPT
    });
  }

  // Replace `verify` later with a real check. A yes-click must not confirm anyone.
  // Advance only when verify resolves:
  //   { ok: true, confirmed: true, stage: stages.HUNTRESS_CONFIRMED }
  // Then call `unlock` for the chapter after that. Neither step is implemented.
  root.UnindexedVerification = {
    stages: STAGES,
    verify: pending,
    unlock: function () {
      return Promise.resolve({
        ok: false,
        confirmed: false,
        stage: STAGES.HUNTRESS_CONFIRMED
      });
    }
  };
})(typeof window !== 'undefined' ? window : this);
