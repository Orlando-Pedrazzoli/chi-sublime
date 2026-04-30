/**
 * Suite de testes standalone para o sistema de autenticação.
 *
 * Execução:
 *   npx tsx scripts/test-auth.ts
 */

import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';

loadEnv({ path: resolve(process.cwd(), '.env.local') });

import mongoose from 'mongoose';
import { User } from '../src/lib/models/User';
import { Client } from '../src/lib/models/Client';
import { hashPassword, verifyPassword, needsRehash } from '../src/lib/auth/password';
import { registerUser, requestPasswordReset, resetPassword } from '../src/lib/server-actions/auth';

let pass = 0;
let fail = 0;
const failures: string[] = [];

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    pass++;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`  ✗ ${name}`);
    console.log(`      ${msg}`);
    failures.push(`${name}: ${msg}`);
    fail++;
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const TEST_EMAIL_SUFFIX = '@test-auth.chisublime.local';

async function cleanup(): Promise<void> {
  await User.deleteMany({ email: { $regex: TEST_EMAIL_SUFFIX } });
  await Client.deleteMany({ email: { $regex: TEST_EMAIL_SUFFIX } });
}

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${TEST_EMAIL_SUFFIX}`;
}

async function suitePasswordUtils(): Promise<void> {
  console.log('\n[1] Password utilities');

  await test('hashPassword produces 60-char bcrypt string', async () => {
    const hash = await hashPassword('Password123');
    assert(typeof hash === 'string', 'Not a string');
    assert(hash.length === 60, `Expected 60 chars, got ${hash.length}`);
    assert(hash.startsWith('$2'), 'Not a bcrypt hash');
  });

  await test('verifyPassword returns true for correct password', async () => {
    const hash = await hashPassword('Password123');
    const valid = await verifyPassword('Password123', hash);
    assert(valid === true, 'Should validate correct password');
  });

  await test('verifyPassword returns false for wrong password', async () => {
    const hash = await hashPassword('Password123');
    const valid = await verifyPassword('WrongPassword', hash);
    assert(valid === false, 'Should reject wrong password');
  });

  await test('verifyPassword returns false for empty inputs', async () => {
    const hash = await hashPassword('Password123');
    assert((await verifyPassword('', hash)) === false, 'Empty password should fail');
    assert((await verifyPassword('Password123', '')) === false, 'Empty hash should fail');
  });

  await test('hashPassword rejects passwords < 8 chars', async () => {
    let threw = false;
    try {
      await hashPassword('short');
    } catch {
      threw = true;
    }
    assert(threw, 'Should throw on short password');
  });

  await test('needsRehash returns false for current rounds', async () => {
    const hash = await hashPassword('Password123');
    assert(needsRehash(hash) === false, 'Current hash should not need rehash');
  });

  await test('needsRehash returns true for empty hash', async () => {
    assert(needsRehash('') === true, 'Empty hash should need rehash');
  });
}

async function suiteRegister(): Promise<void> {
  console.log('\n[2] Register');

  await test('registerUser creates User + Client linked', async () => {
    const email = uniqueEmail('register-ok');
    const result = await registerUser({
      name: 'Test User',
      email,
      phone: '912345678',
      password: 'Password123',
      passwordConfirm: 'Password123',
      acceptTerms: true,
      marketingConsent: false,
      website: '',
    });

    assert(result.success, `Register failed: ${!result.success ? result.error : ''}`);
    assert(result.success && result.data, 'No data returned');

    const user = await User.findOne({ email }).select('+passwordHash');
    assert(user, 'User not in DB');
    assert(user!.role === 'client', 'Wrong role');
    assert(user!.clientId, 'clientId not set');
    assert(user!.passwordHash, 'passwordHash not stored');

    const client = await Client.findById(user!.clientId);
    assert(client, 'Client not created');
    assert(client!.userId?.toString() === user!._id.toString(), 'Client.userId not linked back');
    assert(client!.source === 'online', 'Client source should be online');
  });

  await test('registerUser rejects duplicate email', async () => {
    const email = uniqueEmail('duplicate');
    await registerUser({
      name: 'First',
      email,
      password: 'Password123',
      passwordConfirm: 'Password123',
      acceptTerms: true,
      marketingConsent: false,
      website: '',
    });

    const result = await registerUser({
      name: 'Second',
      email,
      password: 'Password456',
      passwordConfirm: 'Password456',
      acceptTerms: true,
      marketingConsent: false,
      website: '',
    });

    assert(!result.success, 'Should reject duplicate');
    assert(
      !result.success && result.error.toLowerCase().includes('email'),
      'Error should mention email',
    );
  });

  await test('registerUser rejects weak password', async () => {
    const result = await registerUser({
      name: 'Weak',
      email: uniqueEmail('weak'),
      password: 'aaaaaaaa',
      passwordConfirm: 'aaaaaaaa',
      acceptTerms: true,
      marketingConsent: false,
      website: '',
    });
    assert(!result.success, 'Should reject password without numbers');
  });

  await test('registerUser rejects mismatched passwords', async () => {
    const result = await registerUser({
      name: 'Mismatch',
      email: uniqueEmail('mismatch'),
      password: 'Password123',
      passwordConfirm: 'Different456',
      acceptTerms: true,
      marketingConsent: false,
      website: '',
    });
    assert(!result.success, 'Should reject mismatched passwords');
  });

  await test('registerUser auto-matches existing Client without userId', async () => {
    const email = uniqueEmail('automatch');

    const existingClient = await Client.create({
      name: 'Cliente Existente',
      phone: '912345678',
      email,
      source: 'walk-in',
      active: true,
    });

    const result = await registerUser({
      name: 'Cliente Online',
      email,
      password: 'Password123',
      passwordConfirm: 'Password123',
      acceptTerms: true,
      marketingConsent: false,
      website: '',
    });

    assert(result.success, 'Auto-match should succeed');
    assert(
      result.success && result.data!.clientId === existingClient._id.toString(),
      'Should reuse existing Client',
    );

    const user = await User.findOne({ email });
    assert(
      user!.clientId?.toString() === existingClient._id.toString(),
      'User.clientId should match existing',
    );
  });
}

async function suitePasswordReset(): Promise<void> {
  console.log('\n[3] Password reset');

  await test('requestPasswordReset generates token for existing user', async () => {
    const email = uniqueEmail('reset-token');
    await registerUser({
      name: 'Reset Test',
      email,
      password: 'Password123',
      passwordConfirm: 'Password123',
      acceptTerms: true,
      marketingConsent: false,
      website: '',
    });

    const result = await requestPasswordReset({ email, website: '' });
    assert(result.success, 'Should succeed');

    const user = await User.findOne({ email }).select('+passwordResetToken +passwordResetExpires');
    assert(user!.passwordResetToken, 'Token not set');
    assert(user!.passwordResetExpires, 'Expiry not set');
    assert(user!.passwordResetExpires! > new Date(), 'Expiry in the past');
  });

  await test('requestPasswordReset returns success for non-existent email', async () => {
    const result = await requestPasswordReset({
      email: uniqueEmail('nonexistent'),
      website: '',
    });
    assert(result.success, 'Should not reveal existence');
  });

  await test('resetPassword with valid token updates password', async () => {
    const email = uniqueEmail('reset-flow');
    await registerUser({
      name: 'Flow Test',
      email,
      password: 'OldPassword123',
      passwordConfirm: 'OldPassword123',
      acceptTerms: true,
      marketingConsent: false,
      website: '',
    });

    await requestPasswordReset({ email, website: '' });

    const userWithToken = await User.findOne({ email }).select('+passwordResetToken +passwordHash');
    const token = userWithToken!.passwordResetToken!;

    const result = await resetPassword({
      token,
      password: 'NewPassword456',
      passwordConfirm: 'NewPassword456',
    });
    assert(result.success, 'Reset should succeed');

    const updated = await User.findOne({ email }).select('+passwordHash +passwordResetToken');
    assert(!updated!.passwordResetToken, 'Token should be cleared');

    const valid = await verifyPassword('NewPassword456', updated!.passwordHash!);
    assert(valid, 'New password should work');

    const oldStillWorks = await verifyPassword('OldPassword123', updated!.passwordHash!);
    assert(!oldStillWorks, 'Old password should not work anymore');
  });

  await test('resetPassword with invalid token fails', async () => {
    const result = await resetPassword({
      token: 'invalid-token-xxx',
      password: 'NewPassword789',
      passwordConfirm: 'NewPassword789',
    });
    assert(!result.success, 'Should reject invalid token');
  });

  await test('resetPassword with expired token fails', async () => {
    const email = uniqueEmail('expired');
    await registerUser({
      name: 'Expired Test',
      email,
      password: 'Password123',
      passwordConfirm: 'Password123',
      acceptTerms: true,
      marketingConsent: false,
      website: '',
    });

    const expiredToken = 'expired-token-' + Date.now();
    await User.updateOne(
      { email },
      {
        $set: {
          passwordResetToken: expiredToken,
          passwordResetExpires: new Date(Date.now() - 1000),
        },
      },
    );

    const result = await resetPassword({
      token: expiredToken,
      password: 'NewPassword999',
      passwordConfirm: 'NewPassword999',
    });
    assert(!result.success, 'Should reject expired token');
  });
}

async function main(): Promise<void> {
  console.log('═'.repeat(70));
  console.log('  CHI SUBLIME — AUTH TEST SUITE');
  console.log('═'.repeat(70));

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI não definida no .env.local');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    console.log('✓ Connected to MongoDB:', mongoose.connection.name);

    await cleanup();
    console.log('✓ Cleaned previous test data');

    await suitePasswordUtils();
    await suiteRegister();
    await suitePasswordReset();

    await cleanup();
    console.log('\n✓ Cleaned test data');
  } catch (err) {
    console.error('\n✗ Fatal error:', err);
    fail++;
  } finally {
    await mongoose.disconnect();
  }

  console.log('\n' + '═'.repeat(70));
  console.log(`  RESULTS: ${pass} PASS / ${fail} FAIL`);
  console.log('═'.repeat(70));

  if (fail > 0) {
    console.log('\nFailures:');
    failures.forEach((f) => console.log(`  - ${f}`));
    process.exit(1);
  }
  process.exit(0);
}

main();
