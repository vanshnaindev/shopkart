import { resetDatabase, connectMongoDB } from './db.ts';

async function runSeed() {
  console.log('Seeding ShopKart database...');
  await connectMongoDB();
  await resetDatabase();
  console.log(' Seeding completed successfully!');
  process.exit(0);
}

runSeed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
