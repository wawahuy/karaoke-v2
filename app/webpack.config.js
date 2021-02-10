const path = require("path");
const webpack = require("webpack");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const HTMLWebpackPlugin = require("html-webpack-plugin");

const config = (env, options) => {
  const isProduction = options.mode == "production";

  // config rules typescript
  const rulesTypescript = {
    test: /\.(ts|tsx)$/,
    exclude: /node_modules/,
    use: [
      {
        loader: require.resolve("babel-loader"),
        options: {
          sourceMap: !isProduction,
        },
      },
    ],
  };

  // config rules scss
  const rulesScss = {
    test: /\.(scss|sass|css)$/,
    exclude: /node_modules/,
    use: [
      {
        loader: "css-loader",
        options: {
          modules: true,
          sourceMap: !isProduction,
          importLoaders: 1,
          modules: {
            localIdentName: "[local]",
          },
        },
      },
      "sass-loader",
    ],
  };

  if (isProduction) {
    rulesScss.use = [MiniCssExtractPlugin.loader, ...rulesScss.use];
  } else {
    rulesScss.use = ["style-loader", ...rulesScss.use];
  }

  // config rules assets
  const rulesAssets = {
    test: /\.(jpg|png|gif|svg|ttf|woff|jfproj)$/,
    use: [
      {
        loader: "file-loader",
        options: {
          name: "[name].[ext]",
          outputPath: "",
        },
      },
    ],
  };

  // config plugins
  const plugins = [
    new HTMLWebpackPlugin({
      template: path.resolve(__dirname, "public/index.html"),
    }),
  ];
  if (isProduction) {
    plugins.push(
      new MiniCssExtractPlugin({
        filename: "[name].css",
        chunkFilename: "[id].css",
      })
    );
  }

  return {
    node: {
      __dirname: true,
    },
    target: ["electron-main", "electron-renderer"],
    entry: {
      main: "./src/main/index.ts",
      renderer: "./src/renderer/index.tsx",
    },
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: "[name].bundle.js",
    },
    resolve: {
      extensions: [".ts", ".tsx", ".js", ".jsx"],
    },
    module: {
      rules: [rulesTypescript, rulesScss, rulesAssets],
    },
    plugins,
    devServer: {
      hot: true,
      inline: true,
      port: 4000,
    },
    optimization: {
      splitChunks: {
        cacheGroups: {
          commons: {
            test: /[\\/]node_modules[\\/]/,
            name: "vendors",
            chunks: "all",
          },
        },
      },
    },
  };
};

module.exports = config;
