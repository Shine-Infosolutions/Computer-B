const express = require("express");
const {
  getQuotations,
  getQuotation,
  createQuotation,
  updateQuotation,
  deleteQuotation,
  getDeletedQuotations
} = require("../controllers/quotationController");

const router = express.Router();

router.get("/", getQuotations);
router.get("/deleted", getDeletedQuotations);
router.get("/:id", getQuotation);
router.post("/", createQuotation);
router.put("/:id", updateQuotation);
router.delete("/:id", deleteQuotation);


module.exports = router;