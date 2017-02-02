#ifndef UTILS_H
#define UTILS_H

#include <QDebug>
#include <QString>
#include <QTextStream>

inline QString methodName(const std::string& prettyFunction) {
  size_t colons = prettyFunction.find("::");
  size_t begin = prettyFunction.substr(0, colons).rfind(" ") + 1;
  size_t end = prettyFunction.rfind("(") - begin;

  QStringList token =
      QString::fromStdString(prettyFunction.substr(begin, end)).split("::");
  QString className = token.takeFirst();
  QString fName = token.takeFirst();

  return className + "::" + fName + "()";
}

#define __METHOD_NAME__ methodName(__PRETTY_FUNCTION__)

#define TRACE(x)                                                        \
  QTextStream(stdout) << "TRACE " << x << " " << __METHOD_NAME__ << " " \
                      << __FILE__ << ":" << __LINE__ << "\n"
#define TRACE_METHOD()                                                         \
  QTextStream(stdout) << "TRACE " << __METHOD_NAME__ << " " << __FILE__ << ":" \
                      << __LINE__ << "\n"

class Utils {
 public:
  Utils();
  static QString readFile(QString f);
  static QString resolvePath(QString cwd, QString path);
  static QString dirname(QString path);
};

#endif  // UTILS_H
