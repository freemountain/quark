#include "utils.h"

#include <QDir>
#include <QFile>
#include <QFileInfo>
#include <QTextStream>

Utils::Utils() {}

QString Utils::readFile(QString path) {
  QFile file(path);
  if (!file.open(QIODevice::ReadOnly)) return NULL;

  QTextStream stream(&file);
  QString contents = stream.readAll();
  file.close();

  return contents;
}

QString Utils::resolvePath(QString cwd, QString path) {
  QString combinedPath = QFileInfo(QDir(cwd), path).absoluteFilePath();

  return QDir(combinedPath).path();
}

QString Utils::dirname(QString path) { return QDir(path).dirName(); }
