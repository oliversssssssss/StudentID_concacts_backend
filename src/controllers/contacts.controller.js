import { pool } from '../db/pool.js';
import Joi from 'joi';

const normalizePhone = (raw) => {
    if (!raw) return raw;
    return String(raw).trim().replace(/[\s\-().]/g, '');
};

export const contactSchema = Joi.object({
    name:  Joi.string().min(1).max(100).required(),
    phone: Joi.string().min(5).max(32).required(),
    email: Joi.string().email().allow('', null),
    group_name: Joi.string().max(50).allow('', null),
    is_blacklisted: Joi.boolean().optional(),
    note:  Joi.string().max(255).allow('', null),
});

/** 列表（支持筛选：?group=xxx&blacklisted=true|false） */
export async function listContacts(req, res) {
    const { group, blacklisted } = req.query;

    let sql = 'SELECT id, name, phone, email, group_name, is_blacklisted, note, created_at FROM contacts';
    const conds = [];
    const params = [];

    if (group) { conds.push('group_name = ?'); params.push(group); }
    if (typeof blacklisted !== 'undefined') {
        conds.push('is_blacklisted = ?');
        params.push(['true','1','yes','on'].includes(String(blacklisted).toLowerCase()) ? 1 : 0);
    }
    if (conds.length) sql += ' WHERE ' + conds.join(' AND ');
    sql += ' ORDER BY id DESC';

    const [rows] = await pool.query(sql, params);
    res.json(rows);
}

/** 详情 */
export async function getContact(req, res) {
    const id = Number(req.params.id);
    const [[row]] = await pool.query(
        'SELECT id, name, phone, email, group_name, is_blacklisted, note FROM contacts WHERE id=?',
        [id]
    );
    if (!row) return res.status(404).json({ message: 'Not found' });
    res.json(row);
}

/** 新增（按 phone upsert） */
export async function createOrUpdateByPhone(req, res) {
    const payload = req.body;
    payload.phone = normalizePhone(payload.phone);

    const sql = `
        INSERT INTO contacts(name, phone, email, group_name, is_blacklisted, note)
        VALUES(?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                                 name=VALUES(name),
                                 email=VALUES(email),
                                 group_name=VALUES(group_name),
                                 is_blacklisted=VALUES(is_blacklisted),
                                 note=VALUES(note)
    `;
    await pool.query(sql, [
        payload.name,
        payload.phone,
        payload.email || null,
        payload.group_name || null,
        payload.is_blacklisted ? 1 : 0,
        payload.note || null
    ]);

    const [[row]] = await pool.query(
        'SELECT id, name, phone, email, group_name, is_blacklisted, note FROM contacts WHERE phone=?',
        [payload.phone]
    );
    res.status(200).json(row);
}

/** 更新（按 id） */
export async function updateContact(req, res) {
    const id = Number(req.params.id);
    const payload = req.body;
    payload.phone = normalizePhone(payload.phone);

    const [[occupied]] = await pool.query(
        'SELECT id FROM contacts WHERE phone=? AND id<>?',
        [payload.phone, id]
    );
    if (occupied) {
        return res.status(409).json({ message: 'Phone already exists' });
    }

    const [r] = await pool.query(
        'UPDATE contacts SET name=?, phone=?, email=?, group_name=?, is_blacklisted=?, note=? WHERE id=?',
        [
            payload.name,
            payload.phone,
            payload.email || null,
            payload.group_name || null,
            payload.is_blacklisted ? 1 : 0,
            payload.note || null,
            id
        ]
    );
    if (r.affectedRows === 0) return res.status(404).json({ message: 'Not found' });

    const [[row]] = await pool.query(
        'SELECT id, name, phone, email, group_name, is_blacklisted, note FROM contacts WHERE id=?',
        [id]
    );
    res.json(row);
}

/** 删除 */
export async function deleteContact(req, res) {
    const id = Number(req.params.id);
    const [r] = await pool.query('DELETE FROM contacts WHERE id=?', [id]);
    if (r.affectedRows === 0) return res.status(404).json({ message: 'Not found' });
    res.status(204).send();
}

/** 列出所有分组（去重） */
export async function listGroups(req, res) {
    const [rows] = await pool.query(
        'SELECT DISTINCT group_name FROM contacts WHERE group_name IS NOT NULL AND group_name<>"" ORDER BY group_name ASC'
    );
    res.json(rows.map(r => r.group_name));
}

/** 切换黑名单（或直接设置 true/false） */
export async function toggleBlacklist(req, res) {
    const id = Number(req.params.id);
    // 支持 body 里传 { is_blacklisted: true/false }，否则执行 toggle
    const body = req.body || {};
    const hasExplicit = typeof body.is_blacklisted !== 'undefined';

    if (hasExplicit) {
        const v = body.is_blacklisted ? 1 : 0;
        const [r] = await pool.query('UPDATE contacts SET is_blacklisted=? WHERE id=?', [v, id]);
        if (r.affectedRows === 0) return res.status(404).json({ message: 'Not found' });
    } else {
        await pool.query('UPDATE contacts SET is_blacklisted = 1 - is_blacklisted WHERE id=?', [id]);
    }

    const [[row]] = await pool.query('SELECT id, is_blacklisted FROM contacts WHERE id=?', [id]);
    res.json(row);
}
