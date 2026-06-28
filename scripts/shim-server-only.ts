import Module from "node:module";

function installServerOnlyShimForCli() {
  const moduleWithLoad = Module as unknown as {
    _load: (
      request: string,
      parent: NodeModule | null | undefined,
      isMain: boolean,
    ) => unknown;
  };
  const originalLoad = moduleWithLoad._load;

  moduleWithLoad._load = function patchedLoad(request, parent, isMain) {
    if (request === "server-only") return {};
    return originalLoad.call(this, request, parent, isMain);
  };
}

installServerOnlyShimForCli();
