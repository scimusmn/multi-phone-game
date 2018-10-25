from fabric.decorators import task
from fabric.context_managers import cd
from fabric.operations import local, run
from fabric.context_managers import lcd

@task
def app (
        node_user,
        node_server,
        node_server_deploy_path,
        pm2_job):
    """Deploy app to server and setup PM2 process."""

    # Rsync defaults
    rsync_command = 'rsync -avzh --progress'
    # Exclude some paths
    exclude_paths = [
        # Mac only file
        '.DS_Store',
        # IDE
        '.idea',
        # We'll handle downloading node modules on the server
        # This will ensure we don't see any platform specific version issues.
        '/node_modules'
    ]
    rsync_exclude_flag = ' --exclude='
    rsync_exclude = '{1}{0}'.format(
        rsync_exclude_flag.join(exclude_paths),
        rsync_exclude_flag
    ).strip()

    # Rsync application
    local(
        '%s %s %s %s@%s:%s' % (
            rsync_command,
            rsync_exclude,
            './',
            node_user,
            node_server,
            node_server_deploy_path,
        )
    )

    # Ensure our node modules are setup correctly
    with cd(node_server_deploy_path):
        run('yarn')

    # Restart the node server after files are in place
    # If we use the pm2 restart command, pm2-en.json files aren't loaded.
    # Stoping the server and starting it from the file fixes this.
    run('pm2 stop %s' % pm2_job)
    run('pm2 start %s/pm2-env.json' % node_server_deploy_path)

@task
def abcTest ():
    """ABC test - eploy app to server and setup PM2 process."""
    print('hello test');
    local('date');

