#include "rootstore.h"

#include <QTextStream>
#include <QJsonDocument>
#include <QJsonObject>

RootStore::RootStore(QObject *parent) : QObject(parent)
{
    this->currentValue = QJsonObject();
}

QJsonValue RootStore::value() {
    return this->currentValue;
}

void RootStore::writeLine(QString data) {
    QTextStream out(stderr);
    QJsonDocument doc = QJsonDocument::fromJson(data.toUtf8());
    QJsonObject msg = doc.object();
    QString type = msg.value("type").toString();
    QJsonValue payload = msg.value("payload");

    if(type == "value") {
        this->currentValue = payload;
        emit valueChanged(payload);
        return;
    }

    if(type == "action") {
        QJsonObject p = payload.toObject();
        emit mainAction(p.value("type").toString(), p.value("payload"));
        return;
    }

    out << "root store invalid line: " << data;
    out.flush();
}

void RootStore::trigger(QString type, QJsonValue payload) {
    QJsonObject msg;
    QJsonObject msgPayload;
    msg.insert("type", "action");

    msgPayload.insert("type", type);
    msgPayload.insert("payload", payload);

    msg.insert("payload", msgPayload);

    QString l = QString(QJsonDocument(msg).toJson(QJsonDocument::Compact) + "\n");

    emit line(l.toUtf8());
    emit renderAction(type, payload);
}
