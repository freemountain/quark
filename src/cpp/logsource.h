#ifndef LOGSOURCE_H
#define LOGSOURCE_H

#include <QObject>

class LogSource
{
public:
    //virtual ~LogSource(){}

signals:
    virtual void log(QString msg, QString topic = "log") = 0;
};

//Q_DECLARE_INTERFACE(LogSource, "LogSource")


#endif // LOGSOURCE_H
