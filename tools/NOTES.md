#dependencies

- alle os:
  - qpm
  - node
- linux:
  - linuxdeployqt
  - [appimagetool](https://github.com/probonopd/AppImageKit)
  - patchelf
- windows:
  - npm (unter windows nicht mit node gebundelt, warum???)

Von qpm, node und appimagetool können binaries runtergeladen werden.
- qpm
  - unix: https://www.qpm.io/download/$VERSION/$OS_386/qpm
  - win: https://www.qpm.io/download/$VERSION/windows_386/qpm.exe
  - $VERSION="v0.10.0"
  - $OS= linux, darwin
- node
  - unix: https://nodejs.org/dist/$VERSION/node-$VERSION-$OS-$ARCH.tar.xz
  - win: https://nodejs.org/dist/$VERSION/win-$ARCH/node.exe
  - $VERSION="v7.1.0"
  - $OS= linux, darwin
  - $ARCH= x64, x86, arm zeugs..
- appimagetool
  - linux: https://github.com/probonopd/AppImageKit/releases/download/continuous/appimagetool-x86_64.AppImage

zu kompilieren:
  - patchelf
    - git: https://github.com/NixOS/patchelf
    - bauen
      - ./bootstrap.sh
      - ./configure" --prefix=some/path
      - make
      - make install
      - binary: some/path/bin/patchelf
  - linuxdeployqt
    - git: https://github.com/probonopd/linuxdeployqt
    - bauen
      - qmake
      - make
      - binary: linuxdeployqt/linuxdeployqt

## zu linux:
linuxdeployqt ruft appimagetool auf, welches patchelf aufruft. Das heißt, die drei binaries müssen zusammen in einem Ordner liegen, der als PATH gesetzt werden kann. Beispiel linuxdeployqt aufruf:
```bash
P="/path/to/created/bins"
PATH=$P:$PATH "$P/linuxdeployqt"
```

## makefile lösung
  - siehe tools/Makefile
  - cd tools; && make bootstrap
  - benutzt nur tools/uname
  - restliche shs dann müll
## bashscript lösung
  - die sourcen aller dependencies werden nach tmp/$DEPNAME-$VERSION-src geklont
  - unter linux werden linuxdeployqt und patchelf nach
  tmp/$DEPNAME-$VERSION-build gebaut
  - die alle binaries werden nach tmp/bin-$OS-$ARCH kopiert.
  - tmp/bin-$OS-$ARCH kann PATH hinzugefügt werden
  - die script klppen local unter linux und osx, aber nicht unter travis???
