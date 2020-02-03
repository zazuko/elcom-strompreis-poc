# ElCom Strompreis RDF Pipeline

Daten der [Eidgenössischen Elektrizitätskommission ElCom](https://www.strompreis.elcom.admin.ch/) zu [Strompreisen](https://www.elcom.admin.ch/elcom/de/home/themen/strompreise/tarif-rohdaten-verteilnetzbetreiber.html) werden durch diese Pipeline nach RDF überführt.

Die Pipeline baut dabei auf das für das Bundesarchiv entwickelte, generische [Pipelining-System](https://github.com/zazuko/barnard59) auf. Details zu dem System können der entsprechenden Dokumentation entnommen werden. Das System ist vollständig als Open Source Software verfügbar und kann einfach auf Unix ähnlichen Systemen (Linux, MacOS, [Windows mit WSL 2](https://docs.microsoft.com/en-us/windows/wsl/wsl2-install)) installiert und verwendet werden.

## Installation

Um die Pipeline selber ausführen zu können, sind folgende Voraussetzungen zu erfüllen:

* Installierte [Node.js](https://nodejs.org) Umgebung, ab Version 12.x
* [Apache Jena](https://jena.apache.org/) TDB, enthalten im Paket *Apache Jena*. Die [TDB Command line utilities](https://jena.apache.org/documentation/tdb/index.html) müssen im Pfad erreichbar sein.
* Zugangsdaten als Environment-Variablen
  * Zugangsdaten für den sftp-share der Datenanlieferung 
  * Zugangsdaten für den SPARQL-Endpunkt von LINDAS um die Daten zu schreiben

Die Pipeline kann auch in einem [vorkonfigurierten Docker-Container](https://hub.docker.com/r/zazukoians/node-java-jena/) verwendet werden. Dieser Container enthält sämtliche benötigten Werkzeuge und Umgebungen.

### Ausführen der Pipeline

Wenn Node.js & Apache installiert ist, können die Abhängigkeiten installiert werden: `npm install`

Nach dem installieren der Abhängigkeiten kann die Pipeline in verschiedenen Konfigurationen gestartet werden, die verschiedenen Variationen können durch `npm run` ausgegeben werden.

Bei lokalen Tests sollte die Pipeline mit dem Namen `tariff` ausgeführt werden:

```
npm run tariff
```

In dieser Konfiguration werden die Daten als RDF (N-Triples) in eine Datei auf dem lokalen Dateisystem geschrieben.

Die Pipeline kann in einer privaten GitLab Umgebung als [CI/CD Job](https://docs.gitlab.com/ee/ci/README.html) ausgeführt werden, welche die entsprechenden Passwörter für die Zugänge zur Verfügung stellt. Dazu wird der oben verlinkte Docker-Container verwendet und GitLab über die [.gitlab-ci.yml](.gitlab-ci.yml) Datei gestartet.

Die tägliche Ausführung könnte über [GitLab Pipeline Schedules](https://docs.gitlab.com/ce/user/project/pipelines/schedules.html) verwaltet werden, welche den GitLab CI/CD Job startet.

## Implementation der Pipeline

Die Pipeline besteht aus folgenden Schritten:

* Laden der Daten vom lokalen Dateisystem: Die nach CSV konvertierten Daten auf Basis der publizierten Excel-Dateien werden geladen. Im PoC wird dieser Prozess nicht automatisiert und muss manuell einmalig durchgeführt werden.
* Konvertieren jeder einzelnen CSV Datei nach RDF, über die *CSV on the Web* Mapping Dateien im Ordner [metadata](metadata). [CSV on the Web](https://www.w3.org/TR/tabular-data-primer/) ist ein vom W3C definierter Standard.
* Bei der Konvertierung werden unter anderem folgende Arbeiten erledigt:
  * Das Jahr wird aus dem Dateinamen gelesen und entsprechend in die Observation in RDF aufgenommen.
  * Die Liste der Stromnetzbetreiber bietet keinen sauberen Schlüssel für die Betreiber. Dieser wird über einen Hash des Strings gelöst, welcher für jeden Stromnetzbetreiber berechnet wird. In einer zukünftigen Pipeline sollte dies durch eine Slug-Funktion erledigt werden, damit die URIs der Stromnetzbetreiber sprechender werden.
  * Einige weitere, unnötige Datenfelder werden entfernt.
* Nun werden für den ganzen Datensatz die noch fehlenden Metadaten generiert. Dies stellt sicher, dass die Daten über die [Abfrage-API](https://github.com/zazuko/query-rdf-data-cube) welche für das BAFU entwickelt wurde abgefragt werden kann.
* Als letzter Schritt werden die Daten in den SPARQL Endpunkt von LINDAS geschrieben. Bestehende Daten werden dabei ersetzt.

 