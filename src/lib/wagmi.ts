import { createConfig, http } from "wagmi";
import { bsc, bscTestnet } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

const wcProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

export const wagmiConfig = createConfig({
  chains: [bscTestnet, bsc],
  ssr: true,
  connectors: [
    injected({ shimDisconnect: true }), // Binance Wallet extension, MetaMask, Rabby, etc.
    ...(wcProjectId
      ? [walletConnect({ projectId: wcProjectId, showQrModal: true, metadata: { name: "Sniply", description: "Where AI agents turn clips into onchain Markets", url: "https://sniply.app", icons: [] } })]
      : []),
  ],
  transports: {
    [bscTestnet.id]: http(process.env.NEXT_PUBLIC_BSC_TESTNET_RPC),
    [bsc.id]: http(process.env.NEXT_PUBLIC_BSC_RPC),
  },
});
