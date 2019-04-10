
#include <QDir>
#include <QGuiApplication>
#include <QQmlApplicationEngine>
#include <QDebug>

#ifdef QT_STATIC
#  include <QQmlExtensionPlugin>
Q_IMPORT_PLUGIN(FluidCorePlugin)
Q_IMPORT_PLUGIN(FluidControlsPlugin)
Q_IMPORT_PLUGIN(FluidControlsPrivatePlugin)
Q_IMPORT_PLUGIN(FluidTemplatesPlugin)
#endif


#include "quarkapplicationengine.h"
#include "quarkenvironment.h"

int main(int argc, char *argv[])
{
    QCoreApplication::setAttribute(Qt::AA_EnableHighDpiScaling);
    QGuiApplication app(argc, argv);

    QuarkEnvironment environment(&app);
    QuarkApplicationEngine engine(&environment);

    QuarkEnvironment::registerResources(&environment);

    engine.load(QUrl("qrc:/greeter/main.qml"));

    if (engine.rootObjects().length() == 0) {
        qDebug() << "Error: Could not load";
        return 1;
    }

    return app.exec();
}
