import { Router } from 'express';
import {
  listCategories,
  createCategoryHandler,
  updateCategoryHandler,
  deleteCategoryHandler,
} from '../controllers/expenseCategoryController';

const router = Router();

router.get('/', listCategories);
router.post('/', createCategoryHandler);
router.patch('/:id', updateCategoryHandler);
router.delete('/:id', deleteCategoryHandler);

export default router;
