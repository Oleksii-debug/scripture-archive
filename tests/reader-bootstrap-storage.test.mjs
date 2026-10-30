import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import {EDITIONS, editionSelect} from "../public/editions.js";

const source = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const bootStart = source.indexOf("function storedPreference(");
const bootEnd = source.indexOf("\nconst main =", bootStart);
const handlerStart = source.indexOf("async function onReaderEditionChange(");
const handlerEnd = source.indexOf("\nasync function renderReader(", handlerStart);
assert.ok(bootStart >= 0 && bootEnd > bootStart);
assert.ok(handlerStart >= 0 && handlerEnd > handlerStart);
const bootCode = source.slice(bootStart, bootEnd);
const handlerCode = source.slice(handlerStart, handlerEnd);

function startup(storage, search = "") {
  const ctx = vm.createContext({
    URLSearchParams, location: {search, pathname: "/reader/GEN/12", hash: ""},
    localStorage: storage, EDITIONS,
    selectedEdition: lang => EDITIONS[lang]?.[0] || EDITIONS.uk[0],
    loadJSON: (_, fallback) => fallback,
  });
  vm.runInContext(bootCode + '\nglobalThis.snapshot = () => ({language:state.lang, originalSpelling:state.ukOriginal, edition:activeEdition(state.lang).id}); globalThis.rememberReaderChoice = storeReaderPreference;', ctx);
  return ctx;
}

test("denied localStorage read does not prevent primary Bible startup", () => {
  const ctx = startup({getItem() { throw Error("SecurityError"); }, setItem() { throw Error("SecurityError"); }});
  assert.equal(ctx.snapshot().language, "uk");
  assert.equal(ctx.snapshot().originalSpelling, false);
  assert.equal(ctx.snapshot().edition, "uk-ohiienko");
  assert.equal(ctx.rememberReaderChoice("sa.reader", '{"book":"GEN"}'), false);
});

test("explicit query locale survives blocked storage, invalid saved locale is rejected", () => {
  const blocked = startup({getItem() { throw Error("SecurityError"); }}, "?lang=ru");
  assert.equal(blocked.snapshot().language, "ru");
  assert.equal(blocked.snapshot().edition, "ru-synodal");
  const invalid = startup({getItem: key => key === "sa.lang" ? "de" : "original"});
  assert.equal(invalid.snapshot().language, "uk");
  assert.equal(invalid.snapshot().originalSpelling, true);
  const valid = startup({getItem: key => key === "sa.lang" ? "en" : null});
  assert.equal(valid.snapshot().language, "en");
});

test("storage-denied edition change keeps real in-tab selection and keyboard focus", async () => {
  const ctx = startup({getItem() { throw Error("SecurityError"); }, setItem() { throw Error("SecurityError"); }});
  const picker = {focus() {this.focused = true;}};
  const document = {activeElement: picker, querySelector: () => picker};
  const main = {};
  const announcements = [], rendered = [];
  Object.assign(ctx, {
    document, main, t: key => key,
    announce: msg => announcements.push(msg),
    renderReader: async () => {rendered.push(ctx.snapshot().edition); document.activeElement = main;},
  });
  vm.runInContext(handlerCode, ctx);
  await ctx.onReaderEditionChange({currentTarget: picker, target: {value: "uk-kulish"}}, ["reader","GEN","12"]);
  assert.deepEqual(rendered, ["uk-kulish"]);
  assert.equal(ctx.snapshot().edition, "uk-kulish");
  const selected = EDITIONS.uk.find(e => e.id === ctx.snapshot().edition);
  assert.match(editionSelect("uk", String, selected), /value="uk-kulish" selected/);
  assert.match(announcements.join(" "), /лише в цій вкладці/);
  assert.equal(picker.focused, true);
});

test("successful storage write persists existing selector choice; forged choice is refused", async () => {
  const writes = [], announcements = [];
  const ctx = startup({getItem: () => null, setItem: (...args) => writes.push(args)});
  ctx.document = {activeElement: null, querySelector: () => null};
  ctx.main = {};
  ctx.t = key => key;
  ctx.announce = msg => announcements.push(msg);
  let rendered = null;
  ctx.renderReader = async () => {rendered = ctx.snapshot().edition;};
  vm.runInContext(handlerCode, ctx);
  await ctx.onReaderEditionChange({currentTarget: {}, target:{value:"uk-kulish"}}, ["reader","GEN","12"]);
  assert.deepEqual(writes, [["sa.edition.uk", "uk-kulish"]]);
  assert.equal(rendered, "uk-kulish");
  assert.equal(announcements.length, 0);
  await ctx.onReaderEditionChange({currentTarget: {}, target:{value:"uk-unknown"}}, ["reader","GEN","12"]);
  assert.equal(writes.length, 1);
  assert.deepEqual(announcements, ["errorLoad"]);
  assert.equal(ctx.rememberReaderChoice("sa.reader", "chapter"), true);
  assert.deepEqual(writes.at(-1), ["sa.reader", "chapter"]);
});

test("canonical reader uses best-effort bookmark and exactly one edition selector", () => {
  assert.ok(source.includes('storeReaderPreference("sa.reader", JSON.stringify(state.reader))'));
  assert.ok(source.includes("editionSelect(state.lang,esc,chosenEdition)"));
  assert.ok(source.includes("onchange = event => onReaderEditionChange(event, parts)"));
});
