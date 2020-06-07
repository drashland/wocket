import { Drash } from "../deps.ts";
const decoder = new TextDecoder();

// decode HTML
export function decodeHTML(path: string) {
  let template;
  try {
    let fileContentsRaw = Deno.readFileSync(`${path}.html`);

    template = decoder.decode(fileContentsRaw);
  } catch (error) {
    console.log(error);
    throw new Drash.Exceptions.HttpException(
      400,
      `Error reading HTML template.`
    );
  }
  return template;
};