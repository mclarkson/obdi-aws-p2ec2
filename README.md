# obdi-aws-p2ec2
Creates AWS EC2 Instances from Full System Backups.

Dependencies: [obdi-aws-ec2lib](https://github.com/mclarkson/obdi-aws-ec2lib)
Known Users: [obdi-rsyncbackup](https://github.com/mclarkson/obdi-rsyncbackup)

# Todo

* Delete snapshots

# Screenshot

![](images/obdi-aws-p2ec2-small.png?raw=true)

# What is it?

No entry is made in the sidebar for this plugin since this plugin is accessed
from other compatible plugins. For example, when this plugin is installed, the
obdi-rsyncbackup plugin will show a 'Create Amazon EC2 Instance' button in the
file viewer when it thinks it has found a root filesystem. Pressing the button
will take the user to this plugin.

# Installation

## Installing the plugin

* Log into the admin interface, 'https://ObdiHost/manager/admin'.
* In Plugins -> Manage Repositories add, 'https://github.com/mclarkson/obdi-awstools-repository.git'
* In Plugins -> Add Plugin, choose 'aws-p2ec2' and Install.

# Dev

