import * as Parser from "tree-sitter";
import * as Lua from "@tree-sitter-grammars/tree-sitter-lua";

const parser = new Parser();
parser.setLanguage(Lua);

export interface Plugin {
  range: {
    start: {
      row: number,
      column: number,
    },
    end: {
      row: number,
      column: number,
    },
  },
  text: string,
}

export function plugins(text: string): Plugin[] {
  let root = parser.parse(text).rootNode;
  let query = new Parser.Query(Lua, `
      (chunk
        (return_statement
          (expression_list
            (table_constructor
              [
                (field
                  !name
                  value: (string content: (string_content) @plugin))
                (field
                  name: (identifier) @_dependencies (#eq? @_dependencies "dependencies")
                  value: (table_constructor
                    (field
                      !name
                      value: [
                        (string content: (string_content) @plugin)
                        (table_constructor
                          (field
                            !name
                            value: (string content: (string_content) @plugin)))
                      ])))
              ]))))
    `);

  let plugins = [];

  for (const match of query.matches(root)) {
    for (const capture of match.captures) {
      if (capture.name == 'plugin') {
        plugins.push({
          range: {
            start: {
              row: capture.node.startPosition.row,
              column: capture.node.startPosition.column,
            },
            end: {
              row: capture.node.endPosition.row,
              column: capture.node.endPosition.column,
            },
          },
          text: capture.node.text,
        });
      }
    }
  }

  return plugins;
}
