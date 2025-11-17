/** @type {import('next').NextConfig} */
import webpack from "webpack";
import nextPWA from "next-pwa";

const withPWA = nextPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

const nextConfig = {
  reactStrictMode: true,
  logging: {
    incomingRequests: false,
  },
  images: {
    dangerouslyAllowSVG: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "identicon.starknet.id",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "img.starkurabu.com",
        pathname: "/**",
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: process.env.NEXT_PUBLIC_IGNORE_BUILD_ERROR === "true",
  },
  eslint: {
    ignoreDuringBuilds: process.env.NEXT_PUBLIC_IGNORE_BUILD_ERROR === "true",
  },
  webpack: (config, { dev, isServer }) => {
    // Add fallbacks for Node.js modules that aren't available in the browser
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      worker_threads: false,
      "stream/web": false,
      path: false,
      crypto: false,
      stream: false,
      util: false,
      url: false,
      buffer: false,
      process: false,
    };

    config.externals.push("pino-pretty", "lokijs", "encoding");
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(/^node:(.*)$/, (resource) => {
        resource.request = resource.request.replace(/^node:/, "");
      }),
    );

    // Enable WebAssembly support for Midnight wallet
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    // Add rule to handle .wasm files
    config.module.rules.push({
      test: /\.wasm$/,
      type: "webassembly/async",
    });

    // Ignore Node.js-specific modules in browser builds
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "worker_threads": false,
        "stream/web": false,
      };

      // Configure output environment to support async/await for WebAssembly
      config.output.environment = {
        ...config.output.environment,
        asyncFunction: true,
      };
    }

    if (dev && !isServer) {
      config.infrastructureLogging = {
        level: "error",
      };
    }

    return config;
  },
};

export default withPWA(nextConfig);
