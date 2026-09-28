const express = require('express');
const click = require('../services/click');

/* Click serveri shu manzillarga so'rov yuboradi (merchant.click.uz → Сервисы):
     Prepare URL:  https://<backend>/api/click/prepare
     Complete URL: https://<backend>/api/click/complete
   So'rov imzosi (sign_string) CLICK_SECRET_KEY bilan tekshiriladi. */

const router = express.Router();

const handle = (fn) => async (req, res) => {
  const params = { ...req.query, ...req.body };
  try {
    const result = await fn(params);
    if (result.error !== 0) console.warn(`Click ${req.path}: #${params.merchant_trans_id} → ${result.error} ${result.error_note}`);
    res.json(result);
  } catch (err) {
    console.error(`Click ${req.path} xatosi:`, err?.message);
    res.json({
      click_trans_id: params.click_trans_id,
      merchant_trans_id: params.merchant_trans_id,
      error: -7,
      error_note: 'Failed to update user',
    });
  }
};

router.post('/prepare', handle(click.prepare));
router.post('/complete', handle(click.complete));

module.exports = router;
