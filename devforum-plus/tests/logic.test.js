// Run: node --test tests/logic.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const D = require('../devforum-logic.js');

const api = D.reduceDump({
  Version: 'test',
  Classes: [
    { Name: 'HttpService', Members: [{ Name: 'GetAsync' }, { Name: 'CreateWebStreamClient' }] },
    { Name: 'Players', Members: [{ Name: 'LocalPlayer' }, { Name: 'PlayerAdded' }] },
    { Name: 'Part', Members: [] },
  ],
  Enums: [{ Name: 'Material' }, { Name: 'WebStreamClientType' }],
});

const linked = (line) => D.find(line, api).map(x => line.slice(x.start, x.end));

test('the dump shrinks to names', () => {
  assert.deepEqual(api.classes.Players, ['LocalPlayer', 'PlayerAdded']);
  assert.deepEqual(api.enums, ['Material', 'WebStreamClientType']);
});

test('classes, members, enums, services, datatypes, libraries', () => {
  assert.deepEqual(linked('local c = HttpService:CreateWebStreamClient(Enum.WebStreamClientType.WebSocket, {})'), ['HttpService:CreateWebStreamClient', 'Enum.WebStreamClientType']);
  assert.deepEqual(linked('local Players = game:GetService("Players")'), ['Players', 'Players']);
  assert.deepEqual(linked('part.Position = Vector3.new(0, 5, 0)'), ['Vector3.new']);
  assert.deepEqual(linked('task.wait(1)'), ['task.wait']);
  assert.deepEqual(linked('Players.Unknown'), ['Players']);          // not a member: the class alone
  assert.deepEqual(linked('local myPart = Instance.new("Part")'), ['Instance.new', 'Part']);   // the class being made links too
  assert.deepEqual(linked('local x = somethingElse.value'), []);
});

test('links point at the right docs page', () => {
  const [a] = D.find('HttpService:GetAsync(url)', api);
  assert.equal(a.url, 'https://create.roblox.com/docs/reference/engine/classes/HttpService#GetAsync');
  const [e] = D.find('Enum.Material.Plastic', api);
  assert.equal(e.url, 'https://create.roblox.com/docs/reference/engine/enums/Material');
});

test('docs search: exact first, classes before enums', () => {
  assert.equal(D.search(api, 'mat')[0].name, 'math');                 // the library, then
  assert.equal(D.search(api, 'materi')[0].name, 'Material');
  assert.equal(D.search(api, 'players')[0].name, 'Players');
  assert.equal(D.search(api, 'vector3')[0].kind, 'datatype');
  assert.deepEqual(D.search(api, ''), []);
});
