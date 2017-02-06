# quark-prebuilt

Install [Quark](https://github.com/freemountain/quark) prebuilt binaries for
command-line use using npm without having to compile anything.

## Installation

Download and install the latest build of Quark for your OS and add it to your
project's `package.json` as a `devDependency`:

```shell
npm install quark-prebuilt --save-dev
```

Then add th following to your package.json:

```
"scripts": {
  "run": "quark-prebuilt ./package.json",
}
```
