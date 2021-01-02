export const regexes = {
  // deno-lint-ignore camelcase
  const_statements: /version = ".+"/g,
  // deno-lint-ignore camelcase
  egg_json: /"version": ".+"/,
  // deno-lint-ignore camelcase
  import_export_statements: /wocket@v[0-9\.]+[0-9\.]+[0-9\.]/g,
  // deno-lint-ignore camelcase
  yml_deno: /deno: \[".+"\]/g,
};

export const preReleaseFiles = [
  {
    filename: "./egg.json",
    replaceTheRegex: regexes.egg_json,
    replaceWith: `"version": "{{ thisModulesLatestVersion }}"`,
  },
];

export const bumperFiles = [];
