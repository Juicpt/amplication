import {
  AmplicationPlugin,
  EventNames,
  Events,
  PluginInstallation,
  PluginMap,
} from "@amplication/code-gen-types";
import { join } from "path";
import { logger } from "./logging";
import DsgContext from "./dsg-context";

class EmptyPlugin implements AmplicationPlugin {
  init?: (name: string, version: string) => void;
  register: () => Events = () => {
    return {};
  };
}

const functionsObject = ["[object Function]", "[object AsyncFunction]"];

const DSG_ASSETS_FOLDER = "dsg-assets";
const PRIVATE_PLUGINS_FOLDER = "private-plugins";

const getPrivatePluginPath = (pluginId: string) => {
  const buildSpecPath = process.env.BUILD_SPEC_PATH;

  const buildJobFolder = buildSpecPath?.replace("/input.json", "");

  logger.info(`buildJobFolder: ${buildJobFolder}`);

  return join(
    buildJobFolder,
    DSG_ASSETS_FOLDER,
    PRIVATE_PLUGINS_FOLDER,
    pluginId
  );
};

/**
 * generator function that import the plugin requested by user
 * @param pluginList
 * @returns Plugin class
 */
async function* getPluginFuncGenerator(
  pluginList: PluginInstallation[],
  pluginInstallationPath?: string
): AsyncGenerator<new () => AmplicationPlugin> {
  const context = DsgContext.getInstance;

  try {
    const pluginListLength = pluginList.length;
    let index = 0;

    do {
      const localPackage = pluginList[index].settings?.local
        ? join("../../../../", pluginList[index].settings?.destPath)
        : pluginList[index].isPrivate
        ? getPrivatePluginPath(pluginList[index].pluginId)
        : undefined;
      const packageName = localPackage || pluginList[index].npm;

      const func = await getPlugin(
        packageName,
        localPackage ? undefined : pluginInstallationPath
      );

      ++index;
      if (!func.hasOwnProperty("default")) yield EmptyPlugin;

      func.default.prototype.pluginName = packageName;
      yield func.default;
    } while (pluginListLength > index);
  } catch (error) {
    await context.logger.error(`Failed to import plugin: ${error.message}`);
    logger.error(error);
    throw error;
  }
}

async function getPlugin(
  packageName: string,
  customPath: string | undefined
): Promise<any> {
  if (!customPath) {
    try {
      return await import(packageName);
    } catch (error) {
      logger.error(`failed to get plugin: ${error}`);
      throw error;
    }
  }
  const path = join(customPath, packageName);
  if (path) {
    return await import(path);
  }
}

/**
 * loop through all plugin list and set the plugin under each event
 */
const getAllPlugins = async (
  pluginList: PluginInstallation[],
  pluginInstallationPath?: string
): Promise<Events[]> => {
  if (!pluginList.length) return [];

  const pluginFuncsArr: Events[] = [];

  for await (const pluginFunc of getPluginFuncGenerator(
    pluginList,
    pluginInstallationPath
  )) {
    const initializeClass = new pluginFunc();

    const pluginEvents = initializeClass.register();
    if (!Object.entries(pluginEvents).length) {
      continue;
    }

    pluginFuncsArr.push(pluginEvents);
  }

  return pluginFuncsArr;
};

/**
 * main plugin manager function. it trigger plugin import and set the structure for plugin context
 */
const registerPlugins = async (
  pluginList: PluginInstallation[],
  pluginInstallationPath?: string
): Promise<PluginMap> => {
  const pluginMap: PluginMap = {};

  const pluginFuncsArr = (await getAllPlugins(
    pluginList,
    pluginInstallationPath
  )) as Events[];
  if (!pluginFuncsArr.length) return {};

  pluginFuncsArr.reduce(
    (pluginContext: { [key: string]: any }, plugin: Events) => {
      Object.keys(plugin).forEach((eventKey: string) => {
        if (!pluginMap.hasOwnProperty(eventKey))
          pluginContext[eventKey as EventNames] = { before: [], after: [] };

        const { before, after } = plugin[eventKey as keyof Events] || {};

        functionsObject.includes(Object.prototype.toString.call(before)) &&
          pluginContext[eventKey].before.push(before);
        functionsObject.includes(Object.prototype.toString.call(after)) &&
          pluginContext[eventKey].after.push(after);
      });
      return pluginContext;
    },
    pluginMap
  );

  return pluginMap;
};

export default registerPlugins;
