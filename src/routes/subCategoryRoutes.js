const express = require("express");
const router = express.Router();
const subCategoryController = require("../controllers/subCategoryController");

router.get("/categories", subCategoryController.getCategories);
router.get("/categories-with-subs", subCategoryController.getCategoriesWithSubCategories);
router.get("/by-category/:categoryName", subCategoryController.getSubCategoriesByName);
router.post("/", subCategoryController.createSubCategory);
router.get("/", subCategoryController.getAllSubCategories);
router.get("/:id", subCategoryController.getSubCategoryById);
router.put("/:id", subCategoryController.updateSubCategory);
router.delete("/:id", subCategoryController.deleteSubCategory);

module.exports = router;