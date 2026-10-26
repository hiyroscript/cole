import type { Context, Response } from "../types";
import { knowledge } from "../../data/knowledge";
import { executeCapability } from "./capabilities";

// A deliberately bounded, authored French path. No loose translation of data,
// instructions, negation or conditional premises into executable operations.
const definitions: Record<string, { subject: RegExp; text: string }> = {
  dns: {
    subject: /^(?:le )?dns$/i,
    text: "Le DNS associe les noms de domaine à des informations telles que les adresses IP. Une panne DNS peut empêcher de trouver un site même si la connexion fonctionne. Le DNS ne chiffre pas à lui seul le contenu des pages.",
  },
  webgpu: {
    subject: /^(?:le )?webgpu$/i,
    text: "WebGPU est une API de graphisme et de calcul sur GPU. Un moteur compatible peut utiliser ses opérations de calcul pour l’inférence d’un modèle. La présence de l’API ne prouve pas qu’un adaptateur fonctionne ni qu’un modèle donné peut s’exécuter : il faut tester le moteur, la mémoire et l’appareil.",
  },
  webgl: {
    subject: /^(?:le )?webgl$/i,
    text: "WebGL est une API de graphisme dans le navigateur. Certains moteurs représentent des calculs numériques sous forme d’opérations graphiques. Ce fonctionnement diffère des opérations de calcul général de WebGPU ; les limites dépendent du moteur et de l’appareil.",
  },
  wasm: {
    subject: /^(?:le )?(?:webassembly|wasm)$/i,
    text: "WebAssembly est un format de code portable qui s’exécute dans le bac à sable du navigateur. Il peut servir aux calculs sur CPU, notamment comme solution de repli pour l’inférence. Il ne donne pas un accès illimité au système ; SIMD et les fils d’exécution dépendent de la configuration.",
  },
  cookies: {
    subject: /^(?:les )?cookies$/i,
    text: "Les cookies sont de petites données associées à un site. Ils peuvent conserver une session ou des préférences ; certains servent aussi au suivi. Supprimer les cookies de session peut vous déconnecter. Les cookies ne sont pas le cache des ressources du navigateur.",
  },
  "cpu-cache": {
    subject: /^(?:le )?cache (?:cpu|du processeur)$/i,
    text: "Le cache du processeur garde de petites copies de données et d’instructions près des cœurs. Il réduit le coût de certains accès répétés à la mémoire. Il est géré par le matériel et ne remplace ni la RAM ni le stockage persistant.",
  },
  ssd: {
    subject: /^(?:un |le )?ssd$/i,
    text: "Un SSD conserve les fichiers dans une mémoire non volatile, généralement de la mémoire flash. Il garde les données sans alimentation. Sa fonction diffère de celle de la RAM, qui sert de mémoire de travail aux programmes.",
  },
};
export function frenchAnswer(
  input: string,
  context: Context,
  signal?: AbortSignal,
): Response | undefined {
  const calc = input
    .trim()
    .match(
      /^(?:s’il te plaît,? |s'il te plaît,? )?calcule[rz]?\s+([\s\S]+?)[?]?$/i,
    );
  if (calc) {
    const operation = executeCapability(
      "calculate",
      calc[1].replace(/%\s+de\s+/i, "% of "),
      signal,
    );
    context.language = "fr";
    return {
      context,
      operation,
      text:
        operation.status === "completed"
          ? operation.text.replace(
              "Calculated locally:",
              "Calcul effectué localement :",
            )
          : "Calcul non effectué. Utilisez une expression arithmétique explicite, par exemple « Calcule 18% de 475 ».",
    };
  }
  const french = input
    .trim()
    .match(
      /^(?:explique(?:-moi)?|décris|qu['’]est-ce que|c['’]est quoi)\s+(.+?)[?.!]*$/i,
    );
  const preferred =
    context.language === "fr"
      ? input.trim().match(/^(?:explain|what is|describe)\s+(.+?)[?.!]*$/i)
      : null;
  const subject = (french?.[1] ?? preferred?.[1])?.trim();
  if (subject) {
    const entry = Object.entries(definitions).find(([, d]) =>
      d.subject.test(subject),
    );
    if (entry) {
      const [id, definition] = entry,
        record = knowledge.find((k) => k.id === id)!;
      context.language = "fr";
      context.intent = id;
      context.authoredSources = [id];
      context.sources = undefined;
      return {
        context,
        text: `${definition.text}\n\n[Référence](${record.reference}). Vérification éditoriale : ${record.reviewed}.`,
      };
    }
  }
  if (
    french ||
    /^(?:pourquoi|comment|quel(?:le)?|compare|si)\b.*[àéèêçù]|^(?:résume|cherche|quels sont)\b/i.test(
      input,
    )
  ) {
    context.language = "fr";
    context.authoredSources = undefined;
    return {
      context,
      text: "Mon parcours français est limité aux calculs explicites et aux définitions de DNS, WebGPU, WebGL, WebAssembly, cookies, cache CPU et SSD. Cette demande dépasse ce périmètre ; reformulez-la en anglais pour les autres outils et le diagnostic. Je n’ai pas exécuté d’action ni établi de conclusion.",
    };
  }
}
