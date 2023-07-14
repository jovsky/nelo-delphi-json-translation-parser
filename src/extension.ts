/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from "vscode";

const { workspace, window, commands } = vscode;

export function activate(context: vscode.ExtensionContext) {
    start();
}

commands.registerCommand("extension.neloTranslationParse", () => start());

type Lang = "PT_BR" | "EN_US" | "ES_ES";
type Files = {
    PT_BR: vscode.TextDocument;
    EN_US: vscode.TextDocument;
    ES_ES: vscode.TextDocument;
};
const langs = ["PT_BR", "EN_US", "ES_ES"] as const;

async function start() {
    if (!window.activeTextEditor || !workspace.name) {
        return;
    }

    const f = window.activeTextEditor.document;

    const arrSplit = f.fileName.split("\\");
    const filename = arrSplit.splice(-1)[0];

    if (!filename.endsWith(".dict")) {
        console.log("Tipo de arquivo deve ser .dict");
        return;
    }

    const langFolder = arrSplit.splice(-1)[0];
    const i = arrSplit.indexOf(workspace.name);
    const relPath = arrSplit.splice(i + 1).join("/");

    const files = await findAllFiles(relPath, filename);

    if (!files) {
        return;
    }

    parse(files);

    console.log("Arquivos:", files);

    window.showInformationMessage("Finished parsing.");
}

async function findAllFiles(
    path: string,
    fileName: string
): Promise<Files | undefined> {
    const filesUri = await workspace.findFiles(`${path}/*/${fileName}`);
    const fUriPT = filesUri.find((f) => f.path.includes("PT_BR"));
    const fUriEN = filesUri.find((f) => f.path.includes("EN_US"));
    const fUriES = filesUri.find((f) => f.path.includes("ES_ES"));

    if (!(fUriPT && fUriEN && fUriES)) {
        console.log("Não foram encontrados os 3 arquivos de Tradução :(");
        return;
    }

    try {
        return {
            PT_BR: await workspace.openTextDocument(fUriPT),
            EN_US: await workspace.openTextDocument(fUriEN),
            ES_ES: await workspace.openTextDocument(fUriES),
        };
    } catch {
        console.log("Erro no processamento de um dos arquivos.");
        return;
    }
}

function parse(files: Files) {
    const nLines = files.PT_BR.lineCount;

    if (files.EN_US.lineCount !== nLines || files.ES_ES.lineCount !== nLines) {
        console.log("Os arquivos não possui mesmo número de linhas/chaves");
        console.log("- PT_BR:", nLines);
        console.log("- EN_US:", files.EN_US.lineCount);
        console.log("- us:", files.ES_ES.lineCount);
        return;
    }
    console.log("run");

    const ret: Record<string, Record<string, string>> = {};
    for (let i = 0; i < nLines - 1; i++) {
        console.log("run", nLines);
        Object.entries(files).forEach(([lang, file]) => {
            if (!ret[lang]) {
                ret[lang] = {};
            }

            const text = file.lineAt(i).text;
            const arrSplit = text.split(",");
            const [_, _key] = arrSplit.splice(0, 2);
            const _value = arrSplit.join(",");

            const value = _value.slice(1, _value.length - 1);
            if (!_key) {
                const x = 1;
                console.log(x);
            }
            const key = _key.charAt(0).toLowerCase() + _key.slice(1);

            ret[lang][key] = formatParams(value);
        });
    }

    console.log("RESULTADO", ret);
}

function formatParams(value: string) {
    const k = "%s";
    let count = 1;
    while (value.includes(k)) {
        value = value.replace(k, `{{param${count}}}`);
        count++;
    }
    return value;
}

export function deactivate() {}
