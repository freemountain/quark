#ifndef QUARKAPPLICATIONENGINE_H
#define QUARKAPPLICATIONENGINE_H

#include <QQmlApplicationEngine>
#include "quarkenvironment.h"

class QuarkApplicationEngine : public QQmlApplicationEngine
{
public:
    QuarkApplicationEngine(QuarkEnvironment* environment);

protected:
    QuarkEnvironment* environment;
};

#endif // QUARKAPPLICATIONENGINE_H
