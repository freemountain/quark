#ifndef LOGGER_H
#define LOGGER_H

#include <QObject>
#include <QString>

class Logger
{
public:
   virtual ~Logger() {}
   virtual void printLine(QString msg) =0;
};

#endif // LOGGER_H
