const express = require('express');
const multer = require('multer');
const { transcribe, validateApiKey } = require('../controllers/speechController');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }
});

router.post('/transcribe', upload.single('audio'), transcribe);
router.post('/validate-key', validateApiKey);

module.exports = router;
