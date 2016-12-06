#!/bin/bash
set -e
export PATH=/c/mysys64/mingw64/bin:/c/mysys64/usr/bin:$PATH
export PATH=/c/Qt/Tools/mingw53_32/bin:$PATH

find --help
./configure --qt=/c/Qt/5.7/mingw53_32
mingw32-make -j4
mingw32-make clean-build
mingw32-make package
cd build
mv release quark
7z a quark-windows-x86.zip quark
ls
