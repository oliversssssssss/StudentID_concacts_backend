import { Router } from 'express';
import { validate } from '../middlewares/validate.js';
import {
    contactSchema,
    listContacts, getContact, createOrUpdateByPhone, updateContact, deleteContact,
    listGroups, toggleBlacklist
} from '../controllers/contacts.controller.js';

const router = Router();

/** 分组列表 */
router.get('/groups', listGroups);

/** CRUD */
router.get('/', listContacts);
router.get('/:id', getContact);
router.post('/', validate(contactSchema), createOrUpdateByPhone); // upsert
router.put('/:id', validate(contactSchema), updateContact);
router.delete('/:id', deleteContact);

/** 黑名单：PATCH /:id/blacklist  [可选 body: {is_blacklisted:true|false}] */
router.patch('/:id/blacklist', toggleBlacklist);

export default router;
