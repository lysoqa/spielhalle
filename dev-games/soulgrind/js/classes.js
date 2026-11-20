// Die spielbaren Klassen. Hier lassen sich alle Werte zum Ausbalancieren anpassen.
// speed = Pixel pro Sekunde, cooldown = Sekunden zwischen zwei Angriffen,
// growth = Zuwachs pro Level (hp absolut, dmg als Anteil, 0.07 = +7 % Schaden pro Level).
const CLASSES = {
  warrior: {
    id: 'warrior',
    name: 'Krieger',
    gear: 'Schwert + Schild',
    sprite: 'warrior',
    hp: 150,
    speed: 50,
    attack: 'melee',
    damage: [22, 30],
    cooldown: 0.45,
    range: 24, // Reichweite des Schwerthiebs
    arc: Math.PI * 0.8, // Breite des Hiebs (Halbkreis vor dir)
    knockback: 8,
    block: { duration: 1.2, cooldown: 5, slow: 0.45 }, // Rechtsklick
    growth: { hp: 18, dmg: 0.07 },
    pips: { Leben: 5, Schaden: 4, Tempo: 3, Reichweite: 1 },
    hint: 'Linksklick: Schwerthieb · Rechtsklick: Blocken (5 s Abklingzeit)',
  },
  archer: {
    id: 'archer',
    name: 'Schütze',
    gear: 'Bogen',
    sprite: 'archer',
    hp: 110,
    speed: 62,
    attack: 'arrow',
    damage: [20, 28],
    cooldown: 0.7,
    projSpeed: 230,
    range: 175,
    pierce: 2, // Pfeil trifft bis zu 2 Gegner
    knockback: 3,
    growth: { hp: 12, dmg: 0.07 },
    pips: { Leben: 3, Schaden: 3, Tempo: 5, Reichweite: 5 },
    hint: 'Linksklick: Pfeil · durchbohrt bis zu 2 Gegner',
  },
  mage: {
    id: 'mage',
    name: 'Magier',
    gear: 'Buch',
    sprite: 'mage',
    hp: 90,
    speed: 54,
    attack: 'orb',
    damage: [16, 22],
    cooldown: 0.9,
    projSpeed: 135,
    range: 130,
    aoe: 24, // Explosionsradius
    aoeFactor: 0.6, // Schaden an Gegnern in der Nähe
    knockback: 4,
    growth: { hp: 10, dmg: 0.08 },
    pips: { Leben: 2, Schaden: 4, Tempo: 3, Reichweite: 4 },
    hint: 'Linksklick: Magiekugel · explodiert und trifft Gegner in der Nähe',
  },
};
const CLASS_ORDER = ['warrior', 'archer', 'mage'];
