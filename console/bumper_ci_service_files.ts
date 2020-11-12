export const regexes = {
  const_statements: /version = ".+"/g,
  egg_json: /"version": ".+"/,
  import_export_statements: /wocket@v[0-9\.]+[0-9\.]+[0-9\.]/g,
  yml_deno: /deno: \[".+"\]/g,
};

export const preReleaseFiles = [
  {
    filename: "./egg.json",
    replaceTheRegex: regexes.egg_json,
    replaceWith: `"version": "{{ thisModulesLatestVersion }}"`,
  },
  {
    filename: "./README.md",
    replaceTheRegex: regexes.import_export_statements,
    replaceWith: `wocket@v{{ thisModulesLatestVersion }}`,
  },
];

export const bumperFiles = [
  {
    filename: "./.github/workflows/master.yml",
    replaceTheRegex: regexes.yml_deno,
    replaceWith: `deno: ["{{ latestDenoVersion }}"]`,
  },
];
