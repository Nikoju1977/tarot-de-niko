import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readFile} from 'node:fs/promises';

const browser=await chromium.launch({headless:true});
const errors=[];
try{
  const page=await browser.newPage({viewport:{width:1280,height:850},acceptDownloads:true});
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.title.includes('v2.0.0'));
  assert.equal(await page.locator('#heroTitle').count(),1,'Accueil visible');

  await page.locator('#firstName').fill('Test');
  await page.locator('#intention').fill('Comment avancer avec confiance ?');
  await page.locator('#sessionForm button[type=submit]').click();
  await page.locator('#cardBoard .flip-card').first().waitFor();
  assert.equal(await page.locator('#cardBoard .flip-card').count(),3);

  await page.locator('#revealAll').click();
  await page.locator('#interpretation:not([hidden])').waitFor();
  const local=await page.locator('#localReading').innerText();
  assert.match(local,/Lecture symbolique/);
  assert.ok(await page.locator('#cardBoard .flip-card.revealed').count()===3);

  await page.locator('#readingNote').fill('Je veux conserver cette piste.');
  await page.locator('#saveReading').click();
  await page.locator('#vaultPassword').fill('ma phrase secrète solide');
  await page.locator('#vaultOpen').click();
  await page.locator('#journalEntries .journal-entry').first().waitFor();
  assert.equal(await page.locator('#journalEntries .journal-entry').count(),1);
  const entry=await page.locator('#journalEntries .journal-entry').innerText();
  assert.match(entry,/Phrase Optique/);

  const downloadWait=page.waitForEvent('download');
  await page.locator('#exportVault').click();
  const archive=await downloadWait;
  const encrypted=await readFile(await archive.path(),'utf8');
  assert.doesNotMatch(encrypted,/confiance|conserver cette piste/,'Journal non chiffré');
  assert.match(encrypted,/"data"/);

  await page.locator('#lockVault').click();
  // Le chemin import est accessible depuis l'écran verrouillé.
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('#importVaultFile').setInputFiles({
    name:'archive.json',mimeType:'application/json',buffer:Buffer.from(encrypted)
  });
  await page.locator('#vaultPassword').fill('ma phrase secrète solide');
  await page.locator('#vaultOpen').click();
  await page.locator('#journalEntries .journal-entry').first().waitFor();
  assert.equal(await page.locator('#journalEntries .journal-entry').count(),1);
  await page.close();

  const mobile=await browser.newPage({viewport:{width:390,height:844}});
  mobile.on('pageerror',error=>errors.push(error.message));
  await mobile.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
  await mobile.waitForFunction(()=>document.title.includes('v2.0.0'));
  const width=await mobile.evaluate(()=>({screen:innerWidth,content:document.documentElement.scrollWidth}));
  assert.ok(width.content<=width.screen+1,'Pas de défilement horizontal mobile : '+JSON.stringify(width));
  await mobile.locator('#spreadSelect').selectOption('6');
  await mobile.locator('#sessionForm button[type=submit]').click();
  assert.equal(await mobile.locator('#cardBoard .flip-card').count(),6);
  await mobile.locator('#revealAll').click();
  await mobile.locator('#localReading').waitFor();
  assert.match(await mobile.locator('#localReading').innerText(),/Hexagramme|Lecture symbolique/);
  await mobile.close();
  assert.deepEqual(errors,[],'Aucune exception JS navigateur');
  process.stdout.write('Tests navigateur OK : tirage, révélation, journal AES, export/import et mobile.\n');
}finally{await browser.close();}
