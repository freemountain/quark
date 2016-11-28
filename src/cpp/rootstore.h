#ifndef ROOTSTORE_H
#define ROOTSTORE_H

#include <QObject>
#include <QString>
#include <QByteArray>
#include <QJsonValue>
#include <QVariant>
#include <QJSValue>

class RootStore : public QObject
{
    Q_OBJECT
    Q_PROPERTY(QJsonValue value READ value NOTIFY valueChanged)

public:
    explicit RootStore(QObject *parent = 0);
    QJsonValue value();

private:
    QJsonValue currentValue;

signals:
    void valueChanged(QJsonValue val);
    void renderAction(QString type, QJsonValue payload);
    void mainAction(QString type, QJsonValue payload);
    void line(QByteArray line);
    void log(QJSValue msg);

public slots:
    void writeLine(QString line);
    void trigger(QString type, QJsonValue payload);
};

#endif // ROOTSTORE_H
