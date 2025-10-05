const users = [
  // 简化数据，实际应用中会是数据库调用
  { id: 1, email: 'user@example.com', passwordHash: '$2b$10$.JzXg8R2KVS5QRoKLmSOnuklKhRjiFjslkghCakpqfEnXk86utEPm' },
];

/**
 * 查找用户 by Email
 * @param {string} email
 * @returns {object|undefined}
 */
export const findUserByEmail = (email) => users.find(u => u.email === email);