const { exec } = require('child_process');

for (let i = 2; i < process.argv.length; ++i) {
	console.log(process.argv[i]);

	exec(`python -m json.tool ${process.argv[i]} ${process.argv[i]}.bak`, (err, stdout, stderr) => {
		if (err) {
			console.error(err);
			return;
		} else {
			exec(`mv ${process.argv[i]}.bak ${process.argv[i]}`);
		};
	});
}
