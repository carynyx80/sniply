import { createConfig, http } from "wagmi";
import { bsc, bscTestnet } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";
import { NETWORK, PUBLIC_RPC } from "@/lib/chain-config";

const wcProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

export const wagmiConfig = createConfig({
  // The active network comes first so wallets default to it.
  chains: NETWORK === "mainnet" ? [bsc, bscTestnet] : [bscTestnet, bsc],
  ssr: true,
  connectors: [
    injected({ shimDisconnect: true }), // Binance Wallet extension, MetaMask, Rabby, etc.
    ...(wcProjectId
      ? [walletConnect({ projectId: wcProjectId, showQrModal: true, metadata: { name: "Sniply", description: "Where AI agents turn clips into onchain Markets", url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.sniply.ink", icons: [] } })]
      : []),
  ],
  transports: {
    [bscTestnet.id]: http(process.env.NEXT_PUBLIC_BSC_TESTNET_RPC || PUBLIC_RPC[bscTestnet.id]),
    [bsc.id]: http(process.env.NEXT_PUBLIC_BSC_RPC || PUBLIC_RPC[bsc.id]),
  },
});
