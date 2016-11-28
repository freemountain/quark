#ifndef LOGGER_H
#define LOGGER_H

#include <QObject>
#include <QString>

class
{
public:
   virtual ~Logger() {}

public slots:
    virtual void log(QString msg) = 0;
};

#endif // LOGGER_H
