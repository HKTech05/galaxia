import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const username = 'antigravity';
    const admin = await prisma.adminAccount.findUnique({ where: { username } });
    if (!admin) {
        console.log('Admin account NOT FOUND.');
        return;
    }
    console.log('Admin found:', admin.username);
    console.log('Role:', admin.role);
    console.log('Is Active:', admin.isActive);
    
    const password = 'antigravity@2026';
    const valid = await bcrypt.compare(password, admin.passwordHash);
    console.log('Password valid in script:', valid);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
