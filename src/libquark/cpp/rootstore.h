#ifndef ROOTSTORE_H
#define ROOTSTORE_H

#include <QObject>
#include <QString>
#include <QByteArray>
#include <QJsonValue>

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
    void action(QString type, QJsonValue payload);
    void data(QString data);

public slots:
    void writeData(QString data);
    void trigger(QString type, QJsonValue payload);
};

#endif // ROOTSTORE_H
