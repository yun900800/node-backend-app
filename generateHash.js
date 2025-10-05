// generateHash.js

import bcrypt from 'bcryptjs';

const plainPassword = 'password123';
const saltRounds = 10; // 确保与您的 bcryptjs 默认或配置的 cost 相同

async function generateNewHash() {
    try {
        const newHash = await bcrypt.hash(plainPassword, saltRounds);
        console.log("--- NEW HASH GENERATED ---");
        console.log(`Plain Password: ${plainPassword}`);
        console.log(`New Hash (for model): ${newHash}`);
        console.log("--------------------------");
    } catch (error) {
        console.error("Error generating hash:", error);
    }
}

generateNewHash();