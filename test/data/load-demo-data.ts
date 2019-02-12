import { exec, ExecOptions } from "child_process";
import { readdirSync } from "fs";

/**
 * Import demo data into mongo
 * @param  { Object({ db }) } Object containing options : { db : pmongo database }
 * @return {Promise} Promise resolving on import complete
 */

//Borrowed from cross-lead platform,
//TODO: go back and determine if necessary.
function prun(
  cmd: string,
  options: ExecOptions = {}
): Promise<{ err: Error; stdout: string; stderr: string }> {
  return new Promise(res => {
    exec(cmd, options, (err: Error, stdout: string, stderr: string) => {
      res({ err, stdout, stderr });
    });
  });
}

export default async function loadDemoData({
  db,
  verbose = false
}: {
  db: { _name: string };
  verbose: boolean;
}) {
  const dir = `${__dirname}/demo`;

  // spawn child process to import data
  const add = (collection: string) => {
    return prun(`\
      mongoimport \
        --drop \
        --db=${db._name} \
        --collection=${collection} \
        --file=${dir}/${collection}.json \
    `);
  };

  // import json files in parallel
  const results = await Promise.all(
    readdirSync(dir).map(s => add(s.split(".")[0]))
  );

  console.log(results.join(""));
}
