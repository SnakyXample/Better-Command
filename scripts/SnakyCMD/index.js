import {
  world,
  Player,
  BeforeChatEvent,
  ItemStack,
  system,
  Items,
  Container,
  Block,
  GameMode,
  ItemTypes,
  MinecraftEnchantmentTypes,
  MinecraftItemTypes,
  MinecraftDimensionTypes,
  EnchantmentList,
  Entity,
  MinecraftBlockTypes,
  DynamicPropertiesDefinition,
  MolangVariableMap,
  MinecraftEntityTypes,
  Enchantment,
  Vector
} from "@minecraft/server";
import {
  ActionFormData,
  MessageFormData,
  ModalFormData,
  ActionFormResponse,
  MessageFormResponse,
  ModalFormResponse,
} from "@minecraft/server-ui";
import {
  prefix,
  Armor,
  Concrete,
  Dyes,
  Food,
  Furniture,
  Glass,
  Material,
  Spawner,
  Tools,
  Wood,
  Wool,
  DailyRewards,
  DailyRewardsEco,
  DailyRewardsAmount,
  factionCONFIG,
  itemSell,
  Objectives
} from "./Configuration.js";
import { CommandBuild } from "../CommandHandler/CommandBuilder.js";
import { Database } from "../Modules/Database.js";
import { DatabaseDB } from "../TrippleAWap/Database.js";
import { BanDB, HomeDB, LandDB, ServerSetDB, BackDB } from "./Db.js"
import Configuration from "./Configuration.js";
import { getFormattedDate, getCurrentDimension, getSetting, noTPA, getPrefix } from "../functions/index.js"
try {
  world
    .getAllPlayers()
    .map((pls) =>
      pls.runCommandAsync(`scoreboard objectives add setting dummy`)
    );
} catch (e) {}

world.events.playerSpawn.subscribe((eventData) => {
  let { player, initialSpawn } = eventData;
  if (!initialSpawn) return;
  try {
    world.scoreboard.addObjective("warps:data", "Warps Data");
  } catch {}
});

world.events.playerSpawn.subscribe((eventData) => {
  let { player, initialSpawn } = eventData;
  if (!initialSpawn) return;
  player.runCommandAsync(`scoreboard objectives add ${Objectives} dummy`)
  player.runCommandAsync(`scoreboard objectives add bank dummy`)
  player.runCommandAsync(`scoreboard objectives add clan dummy`)
  player.runCommandAsync(`scoreboard objectives add job dummy`)
  player.runCommandAsync(`scoreboard objectives add ping dummy`)
  player.runCommandAsync(`scoreboard objectives add Kills dummy`)
  player.runCommandAsync(`scoreboard objectives add Deaths dummy`)
});

world.events.playerSpawn.subscribe(async (data) => {
  let player = data.player;
  if (data.initialSpawn) {
    if (BanDB.get(player.name) != undefined)
      return player.runCommandAsync(
        `kick "${
          player.name
        }" \n§c§lERROR ⚠\n§c7ou're have been banned\nReason : §e${
          BanDB.get(player.name).reason
        } \n§7By : §e${BanDB.get(player.name).by}`
      );
    if (player.getTags().find((t) => t.startsWith("tpasetting")) == undefined) {
      player.addTag("tpasetting:on");
    }
  } else {
    if (player.hasTag("died")) {
      player.removeTag("died");
      if ((getSetting("backSystem") ?? "true") == "false") return;
      player.sendMessage(
        `§cYou just died! Use §a${getPrefix()}back §cto teleport to your death location.`
      );
    }
  }
});

world.events.playerLeave.subscribe(async (data) => {
  let playerName = data.playerName;
  playerOnline.splice(
    playerOnline.findIndex((p) => p.name == playerName),
    1
  );
});

system.runInterval(async () => {
  let tick = system.currentTick;
  if (tick % 20 === 0) {
    for (const p of backCooldown) {
      if (p.cooldown - 1 >= 1) {
        p.cooldown = p.cooldown - 1;
      } else {
        backCooldown.splice(
          backCooldown.findIndex((l) => l == p),
          1
        );
      }
    }
    for (const p of tpaCooldown) {
      if (p.cooldown - 1 >= 1) {
        p.cooldown = p.cooldown - 1;
      } else {
        tpaCooldown.splice(
          tpaCooldown.findIndex((l) => l == p),
          1
        );
      }
    }
    for (const p of homeCooldown) {
      if (p.cooldown - 1 >= 1) {
        p.cooldown = p.cooldown - 1;
      } else {
        homeCooldown.splice(
          homeCooldown.findIndex((l) => l == p),
          1
        );
      }
    }
    for (const p of warpCooldown) {
      if (p.cooldown - 1 >= 1) {
        p.cooldown = p.cooldown - 1;
      } else {
        warpCooldown.splice(
          warpCooldown.findIndex((l) => l == p),
          1
        );
      }
    }
    for (const p of commandCooldown) {
      if (p.cooldown - 1 >= 1) {
        p.cooldown = p.cooldown - 1;
      } else {
        commandCooldown.splice(
          commandCooldown.findIndex((l) => l == p),
          1
        );
      }
    }
    for (const player of world.getPlayers()) {
      if (playerOnline.find((p) => p.name == player.name) == undefined) {
        playerOnline.push({
          name: player.name,
          online: 0,
        });
      } else {
        playerOnline[
          playerOnline.findIndex((p) => p.name == player.name)
        ].online += 1;
      }
    }
  }
  for (const player of world.getPlayers()) {
    const banTag = player
      .getTags()
      .find((t) => t.toLowerCase().startsWith("ban-"));
    if (banTag) {
      if (BanDB.has(player.name)) continue;
      const reason = banTag.split("-")[1];
      await BanDB.set(player.name, {
        reason: reason,
        by: "System",
      });
      player.removeTag(banTag);
      player.runCommandAsync(
        `kick "${player.name}" \n§c§lYou have been banned\nReason: §e${reason}\n§cBy: §eSystem`
      );
    }
  }
});

world.events.entityHurt.subscribe(async (data) => {
  let entityHurt = data.hurtEntity;
  if (
    entityHurt.typeId === "minecraft:player" &&
    entityHurt.getComponent("health").current <= 0
  ) {
    entityHurt.addTag("died");
    if ((getSetting("backSystem") ?? "true") == "false") return;
    const backData = {
      x: Math.floor(entityHurt.location.x),
      y: Math.floor(entityHurt.location.y),
      z: Math.floor(entityHurt.location.z),
      dimension: getCurrentDimension(entityHurt),
    };
    await BackDB.set(`Back-${entityHurt.nameTag}`, backData);
    if (backCooldown.find((b) => b.name == entityHurt.nameTag) != undefined) {
      backCooldown.splice(
        backCooldown.findIndex((b) => b.name == entityHurt.nameTag),
        1
      );
    }
  }
});

world.events.playerLeave.subscribe((event) => log.delete(event.playerName));
/**
 * Capitalize string
 * @param {string} str
 * @returns {string}
 * @example capitalize("minecraft") -> "Minecraft"
 */
const capitalize = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Sell the item currently held by the player
 * @param {Player} player The player
 * @returns {number} The amount of ${Objectives} that the player made
 */

Object.prototype.deleteValue = function (v) {
    Object.keys(this).forEach(k => { if (this[k] === v) delete this[k] });
};

const noDB = new Map();

function getItemAmount(source, itemId) {
    itemId = itemId.replace('minecraft:','')
    const { container } = source.getComponent('inventory')
    return Array.from({ length: container.size }, (_, i) => {
        const { amount, typeId } = container.getSlot(i);
        if (typeId?.replace('minecraft:','') !== itemId) return 0;
        return amount;
    }).reduce((a, b) => a + b, 0)
}

world.events.blockBreak.subscribe((event) => {
  const player = event.player;
  const block = event.brokenBlockPermutation.type;

  for (let i = 0; i < d.length; i++) {
    if (block.id === d[i].blockID) {
      const count = (noDB.get(player.nameTag) || 0) + d[i].amount;
      noDB.set(player.nameTag, count);

      const itemCount = getItemAmount(player, d[i].itemID);

      if (count >= maxDiamond) {
        player.runCommandAsync(`tellraw @a[tag=Admin] {"rawtext":[{"text":"§c§lWARNING §r§8- §e${player.name} §7Mining §e${d[i].name} §7${itemCount}x"}]}`);
      }
      break; // Hentikan loop setelah menemukan blok yang cocok
    }
  }
});

let maxDiamond = 5

const d = [
  {
    blockID: "minecraft:diamond_ore",
    name: "Diamond",
    amount: 1,
    itemID: "minecraft:diamond",
  },
  {
    blockID: "minecraft:deepslate_diamond_ore",
    name: "Diamond",
    amount: 1,
    itemID: "minecraft:diamond",
  },
  {
    blockID: "minecraft:iron_ore",
    name: "Iron Ingot",
    amount: 1,
    itemID: "minecraft:raw_iron",
  },
  {
    blockID: "minecraft:deepslate_iron_ore",
    name: "Iron Ingot",
    amount: 1,
    itemID: "minecraft:raw_iron",
  },
  {
    blockID: "minecraft:nether_gold_ore",
    name: "Netherite Scrap",
    amount: 1,
    itemID: "minecraft:netherite_scrap",
  }
];

system.events.beforeWatchdogTerminate.subscribe(data => {
  data.cancel = true;
});


console.warn("[SNAKY] Custom Command V1.0.4-BETA loaded.");
console.warn(`loaded in ${getFormattedDate()}`);