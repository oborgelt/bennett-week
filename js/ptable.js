/* Shared periodic table data + full-size page. Masses/positions stay one source. */
(function (global) {
  const PTABLE = [
    ["H", "Hydrogen", 1, "1.008", 1, 1],
    ["He", "Helium", 2, "4.003", 1, 18],
    ["Li", "Lithium", 3, "6.94", 2, 1],
    ["Be", "Beryllium", 4, "9.012", 2, 2],
    ["B", "Boron", 5, "10.81", 2, 13],
    ["C", "Carbon", 6, "12.01", 2, 14],
    ["N", "Nitrogen", 7, "14.01", 2, 15],
    ["O", "Oxygen", 8, "16.00", 2, 16],
    ["F", "Fluorine", 9, "19.00", 2, 17],
    ["Ne", "Neon", 10, "20.18", 2, 18],
    ["Na", "Sodium", 11, "22.99", 3, 1],
    ["Mg", "Magnesium", 12, "24.31", 3, 2],
    ["Al", "Aluminum", 13, "26.98", 3, 13],
    ["Si", "Silicon", 14, "28.09", 3, 14],
    ["P", "Phosphorus", 15, "30.97", 3, 15],
    ["S", "Sulfur", 16, "32.06", 3, 16],
    ["Cl", "Chlorine", 17, "35.45", 3, 17],
    ["Ar", "Argon", 18, "39.95", 3, 18],
    ["K", "Potassium", 19, "39.10", 4, 1],
    ["Ca", "Calcium", 20, "40.08", 4, 2],
    ["Sc", "Scandium", 21, "44.96", 4, 3],
    ["Ti", "Titanium", 22, "47.87", 4, 4],
    ["V", "Vanadium", 23, "50.94", 4, 5],
    ["Cr", "Chromium", 24, "52.00", 4, 6],
    ["Mn", "Manganese", 25, "54.94", 4, 7],
    ["Fe", "Iron", 26, "55.85", 4, 8],
    ["Co", "Cobalt", 27, "58.93", 4, 9],
    ["Ni", "Nickel", 28, "58.69", 4, 10],
    ["Cu", "Copper", 29, "63.55", 4, 11],
    ["Zn", "Zinc", 30, "65.38", 4, 12],
    ["Ga", "Gallium", 31, "69.72", 4, 13],
    ["Ge", "Germanium", 32, "72.63", 4, 14],
    ["As", "Arsenic", 33, "74.92", 4, 15],
    ["Se", "Selenium", 34, "78.97", 4, 16],
    ["Br", "Bromine", 35, "79.90", 4, 17],
    ["Kr", "Krypton", 36, "83.80", 4, 18],
    ["Rb", "Rubidium", 37, "85.47", 5, 1],
    ["Sr", "Strontium", 38, "87.62", 5, 2],
    ["Y", "Yttrium", 39, "88.91", 5, 3],
    ["Zr", "Zirconium", 40, "91.22", 5, 4],
    ["Nb", "Niobium", 41, "92.91", 5, 5],
    ["Mo", "Molybdenum", 42, "95.95", 5, 6],
    ["Tc", "Technetium", 43, "98", 5, 7],
    ["Ru", "Ruthenium", 44, "101.1", 5, 8],
    ["Rh", "Rhodium", 45, "102.9", 5, 9],
    ["Pd", "Palladium", 46, "106.4", 5, 10],
    ["Ag", "Silver", 47, "107.9", 5, 11],
    ["Cd", "Cadmium", 48, "112.4", 5, 12],
    ["In", "Indium", 49, "114.8", 5, 13],
    ["Sn", "Tin", 50, "118.7", 5, 14],
    ["Sb", "Antimony", 51, "121.8", 5, 15],
    ["Te", "Tellurium", 52, "127.6", 5, 16],
    ["I", "Iodine", 53, "126.9", 5, 17],
    ["Xe", "Xenon", 54, "131.3", 5, 18],
    ["Cs", "Cesium", 55, "132.9", 6, 1],
    ["Ba", "Barium", 56, "137.3", 6, 2],
    ["La", "Lanthanum", 57, "138.9", 8, 3],
    ["Hf", "Hafnium", 72, "178.5", 6, 4],
    ["Ta", "Tantalum", 73, "180.9", 6, 5],
    ["W", "Tungsten", 74, "183.8", 6, 6],
    ["Re", "Rhenium", 75, "186.2", 6, 7],
    ["Os", "Osmium", 76, "190.2", 6, 8],
    ["Ir", "Iridium", 77, "192.2", 6, 9],
    ["Pt", "Platinum", 78, "195.1", 6, 10],
    ["Au", "Gold", 79, "197.0", 6, 11],
    ["Hg", "Mercury", 80, "200.6", 6, 12],
    ["Tl", "Thallium", 81, "204.4", 6, 13],
    ["Pb", "Lead", 82, "207.2", 6, 14],
    ["Bi", "Bismuth", 83, "209.0", 6, 15],
    ["Po", "Polonium", 84, "209", 6, 16],
    ["At", "Astatine", 85, "210", 6, 17],
    ["Rn", "Radon", 86, "222", 6, 18],
    ["Fr", "Francium", 87, "223", 7, 1],
    ["Ra", "Radium", 88, "226", 7, 2],
    ["Ac", "Actinium", 89, "227", 9, 3],
    ["Rf", "Rutherfordium", 104, "267", 7, 4],
    ["Db", "Dubnium", 105, "268", 7, 5],
    ["Sg", "Seaborgium", 106, "269", 7, 6],
    ["Bh", "Bohrium", 107, "270", 7, 7],
    ["Hs", "Hassium", 108, "277", 7, 8],
    ["Mt", "Meitnerium", 109, "278", 7, 9],
    ["Ds", "Darmstadtium", 110, "281", 7, 10],
    ["Rg", "Roentgenium", 111, "282", 7, 11],
    ["Cn", "Copernicium", 112, "285", 7, 12],
    ["Nh", "Nihonium", 113, "286", 7, 13],
    ["Fl", "Flerovium", 114, "289", 7, 14],
    ["Mc", "Moscovium", 115, "290", 7, 15],
    ["Lv", "Livermorium", 116, "293", 7, 16],
    ["Ts", "Tennessine", 117, "294", 7, 17],
    ["Og", "Oganesson", 118, "294", 7, 18],
    ["Ce", "Cerium", 58, "140.1", 8, 4],
    ["Pr", "Praseodymium", 59, "140.9", 8, 5],
    ["Nd", "Neodymium", 60, "144.2", 8, 6],
    ["Pm", "Promethium", 61, "145", 8, 7],
    ["Sm", "Samarium", 62, "150.4", 8, 8],
    ["Eu", "Europium", 63, "152.0", 8, 9],
    ["Gd", "Gadolinium", 64, "157.3", 8, 10],
    ["Tb", "Terbium", 65, "158.9", 8, 11],
    ["Dy", "Dysprosium", 66, "162.5", 8, 12],
    ["Ho", "Holmium", 67, "164.9", 8, 13],
    ["Er", "Erbium", 68, "167.3", 8, 14],
    ["Tm", "Thulium", 69, "168.9", 8, 15],
    ["Yb", "Ytterbium", 70, "173.0", 8, 16],
    ["Lu", "Lutetium", 71, "175.0", 8, 17],
    ["Th", "Thorium", 90, "232.0", 9, 4],
    ["Pa", "Protactinium", 91, "231.0", 9, 5],
    ["U", "Uranium", 92, "238.0", 9, 6],
    ["Np", "Neptunium", 93, "237", 9, 7],
    ["Pu", "Plutonium", 94, "244", 9, 8],
    ["Am", "Americium", 95, "243", 9, 9],
    ["Cm", "Curium", 96, "247", 9, 10],
    ["Bk", "Berkelium", 97, "247", 9, 11],
    ["Cf", "Californium", 98, "251", 9, 12],
    ["Es", "Einsteinium", 99, "252", 9, 13],
    ["Fm", "Fermium", 100, "257", 9, 14],
    ["Md", "Mendelevium", 101, "258", 9, 15],
    ["No", "Nobelium", 102, "259", 9, 16],
    ["Lr", "Lawrencium", 103, "266", 9, 17]
  ];

  const FAMILIES = [
    ["alkali", "Alkali"],
    ["alkaline-earth", "Alkaline earth"],
    ["transition", "Transition"],
    ["metalloid", "Metalloid"],
    ["other-metal", "Other metal"],
    ["nonmetal", "Nonmetal"],
    ["halogen", "Halogen"],
    ["noble", "Noble gas"],
    ["lanthanide", "Lanthanide"],
    ["actinide", "Actinide"]
  ];

  const METALLOIDS = { B: 1, Si: 1, Ge: 1, As: 1, Sb: 1, Te: 1, Po: 1 };
  const OTHER_METALS = { Al: 1, Ga: 1, In: 1, Sn: 1, Tl: 1, Pb: 1, Bi: 1, Nh: 1, Fl: 1, Mc: 1, Lv: 1 };
  const NONMETALS = { H: 1, C: 1, N: 1, O: 1, P: 1, S: 1, Se: 1 };
  const GASES = { H: 1, He: 1, N: 1, O: 1, F: 1, Ne: 1, Cl: 1, Ar: 1, Kr: 1, Xe: 1, Rn: 1 };
  const LIQUIDS = { Br: 1, Hg: 1 };

  function familyOf(el) {
    const symbol = el[0];
    const z = el[2];
    const group = el[5];
    if (z >= 57 && z <= 71) return "lanthanide";
    if (z >= 89 && z <= 103) return "actinide";
    if (group === 1 && symbol !== "H") return "alkali";
    if (group === 2) return "alkaline-earth";
    if (group === 17) return "halogen";
    if (group === 18) return "noble";
    if (METALLOIDS[symbol]) return "metalloid";
    if (NONMETALS[symbol]) return "nonmetal";
    if (OTHER_METALS[symbol]) return "other-metal";
    if (group >= 3 && group <= 12) return "transition";
    return "other-metal";
  }

  function familyLabel(key) {
    const hit = FAMILIES.filter(function (f) { return f[0] === key; })[0];
    return hit ? hit[1] : key;
  }

  function chargeOf(el) {
    const group = el[5];
    if (group === 1) return "+1";
    if (group === 2) return "+2";
    if (group === 17) return "−1";
    if (group === 18) return "0";
    return "";
  }

  function stateOf(el) {
    const symbol = el[0];
    const z = el[2];
    if (GASES[symbol]) return "gas";
    if (LIQUIDS[symbol]) return "liquid";
    if (z >= 104) return "";
    return "solid";
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function findByRC(r, c) {
    for (let i = 0; i < PTABLE.length; i += 1) {
      if (PTABLE[i][4] === r && PTABLE[i][5] === c) return PTABLE[i];
    }
    return null;
  }

  function findBySymbol(symbol) {
    for (let i = 0; i < PTABLE.length; i += 1) {
      if (PTABLE[i][0] === symbol) return PTABLE[i];
    }
    return null;
  }

  function detailHtml(el) {
    if (!el) return "Tap an element.";
    const fam = familyOf(el);
    const charge = chargeOf(el);
    const state = stateOf(el);
    const bits = [
      "Period " + el[4] + " · Group " + el[5],
      "Family: " + familyLabel(fam)
    ];
    if (charge) bits.push("Typical charge: " + charge);
    if (state) bits.push("Room temp: " + state);
    return "<strong>" + esc(el[1]) + "</strong> · " + esc(el[0]) +
      "<span>#" + el[2] + " · " + esc(el[3]) + "</span>" +
      "<span>" + esc(bits.join(" · ")) + "</span>";
  }

  function paintStamp() {
    const el = document.getElementById("build-stamp");
    const meta = global.BW_BUILD || { build: 0, modified: "" };
    if (!el) return;
    el.innerHTML = "<span>Build " + esc(meta.build) + "</span>";
    el.title = "Build " + meta.build;
  }

  function showFullElement(symbol) {
    const host = document.getElementById("pt-detail");
    const el = findBySymbol(symbol);
    if (!host) return;
    host.innerHTML = detailHtml(el);
    document.querySelectorAll(".pt-el[data-el]").forEach(function (btn) {
      btn.classList.toggle("on", btn.getAttribute("data-el") === symbol);
    });
  }

  function buildFullGrid() {
    const grid = document.getElementById("pt-grid");
    if (!grid) return;
    const cells = [];
    for (let r = 1; r <= 9; r += 1) {
      for (let c = 1; c <= 18; c += 1) {
        if (r >= 8 && c <= 2) {
          cells.push("<span class=\"pt-el empty\" aria-hidden=\"true\"></span>");
          continue;
        }
        if ((r === 6 || r === 7) && c === 3) {
          const mark = r === 6 ? "57–71" : "89–103";
          cells.push("<span class=\"pt-el marker\" aria-hidden=\"true\">" + mark + "</span>");
          continue;
        }
        const hit = findByRC(r, c);
        if (!hit) {
          cells.push("<span class=\"pt-el empty\" aria-hidden=\"true\"></span>");
          continue;
        }
        const fam = familyOf(hit);
        cells.push(
          "<button type=\"button\" class=\"pt-el bc-el fam-" + fam + "\" data-el=\"" + esc(hit[0]) + "\" title=\"" + esc(hit[1]) + "\">" +
            "<span class=\"pt-el-z\">" + hit[2] + "</span>" +
            "<span class=\"pt-el-s\">" + esc(hit[0]) + "</span>" +
          "</button>"
        );
      }
    }
    grid.innerHTML = cells.join("");
    grid.querySelectorAll("[data-el]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        showFullElement(btn.getAttribute("data-el"));
      });
    });
  }

  function paintLegend() {
    const host = document.getElementById("pt-legend");
    if (!host) return;
    host.innerHTML = FAMILIES.map(function (f) {
      return "<li><span class=\"pt-swatch fam-" + f[0] + "\"></span>" + esc(f[1]) + "</li>";
    }).join("");
  }

  function bootPtablePage() {
    if (!document.getElementById("pt-grid")) return;
    paintStamp();
    paintLegend();
    buildFullGrid();
    const first = findBySymbol("H");
    const host = document.getElementById("pt-detail");
    if (host) host.innerHTML = "Tap an element.";
    if (first) {
      /* keep the prompt until he taps */
    }
  }

  global.BW_PTABLE = PTABLE;
  global.BW_PTABLE_HELP = {
    FAMILIES: FAMILIES,
    familyOf: familyOf,
    familyLabel: familyLabel,
    chargeOf: chargeOf,
    stateOf: stateOf,
    detailHtml: detailHtml
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootPtablePage);
  } else {
    bootPtablePage();
  }
})(window);
