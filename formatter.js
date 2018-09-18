const { execSync } = require('child_process');

for (let i = 2; i < process.argv.length; ++i) {
	console.log(process.argv[i]);

	execSync(`python -m json.tool ${process.argv[i]} ${process.argv[i]}.bak`);
	execSync(`mv ${process.argv[i]}.bak ${process.argv[i]}`);
}
