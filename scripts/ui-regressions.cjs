// Current UI workflow logic. Live browser/layout checks are documented separately.
// Runs without a browser, user credentials, live classrooms or paid model calls.
const {spawnSync}=require('node:child_process');
const result=spawnSync(process.execPath,['node_modules/tsx/dist/cli.mjs','--test','scripts/ui-workflows.test.ts'],{stdio:'inherit'});
if(result.error){console.error('Could not start UI workflow tests.');process.exit(1);}
process.exit(result.status??1);
