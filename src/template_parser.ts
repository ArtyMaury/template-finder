const templateRegex = /{{(.+)}}/g;

export default {
    parseTextForTemplates: function (text: string): Array<Template> {
        let templates: Array<Template> = new Array;
        let match;
        while (match = templateRegex.exec(text)) {
            const template: Template = {
                name: match[1].trim(),
                start: match.index,
                end: match.index + match[0].length
            };

            templates.push(template);
        }
        return templates;
    }
};

export interface Template {
    name: string;
    start: number;
    end: number;
}